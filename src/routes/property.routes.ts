import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db';
import { authenticate, authorize, validateRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// 創建物業驗證 schema
const createPropertySchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, '物業名稱不能為空')
      .max(100, '物業名稱最多100個字符'),
    address: z.string().optional(),
    owner_name: z.string().optional(),
    owner_phone: z.string().optional(),
  }),
});

// 更新物業驗證 schema
const updatePropertySchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    name: z.string()
      .min(1, '物業名稱不能為空')
      .max(100, '物業名稱最多100個字符')
      .optional(),
    address: z.string().optional(),
    owner_name: z.string().optional(),
    owner_phone: z.string().optional(),
  }),
});

// 獲取物業列表驗證 schema
const getPropertiesSchema = z.object({
  query: z.object({
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).optional().default('20'),
    search: z.string().optional(),
  }),
});

/**
 * @route POST /properties
 * @description 創建新物業
 * @access 需要管理員權限
 */
router.post(
  '/properties',
  authenticate,
  authorize('super_admin', 'admin'),
  validateRequest(createPropertySchema),
  async (req, res) => {
    try {
      const { name, address, owner_name, owner_phone } = req.body;
      const currentUser = req.user!;
      
      // 檢查物業名稱是否已存在
      const existingProperty = await queryOne(
        'SELECT id FROM properties WHERE name = $1',
        [name]
      );
      
      if (existingProperty) {
        return res.status(409).json({
          success: false,
          error: '物業已存在',
          message: '物業名稱已存在，請使用其他名稱',
        });
      }
      
      // 創建物業
      const property = await queryOne(
        `INSERT INTO properties (name, address, owner_name, owner_phone)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, address, owner_name, owner_phone]
      );
      
      // 記錄操作日誌
      await query(
        `INSERT INTO operation_logs (user_id, action_type, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          currentUser.userId,
          'create_property',
          'property',
          property.id,
          JSON.stringify({
            name,
            address,
            owner_name,
            owner_phone,
          }),
        ]
      );
      
      logger.info(`創建物業成功: ${currentUser.username} -> ${name}`);
      
      res.status(201).json({
        success: true,
        data: { property },
        message: '創建物業成功',
      });
    } catch (error) {
      logger.error('創建物業失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '創建物業失敗',
      });
    }
  }
);

/**
 * @route GET /properties
 * @description 獲取物業列表（分頁）
 * @access 需要認證
 */
router.get(
  '/properties',
  authenticate,
  validateRequest(getPropertiesSchema),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const offset = (page - 1) * limit;
      const currentUser = req.user!;
      
      // 構建查詢條件
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (search) {
        whereClause += ` AND (
          name ILIKE $${paramIndex} OR 
          address ILIKE $${paramIndex} OR 
          owner_name ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      // 獲取總數
      const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM properties ${whereClause}`,
        params
      );
      
      const total = parseInt(countResult?.count || '0');
      const totalPages = Math.ceil(total / limit);
      
      // 獲取物業列表
      const properties = await query(
        `SELECT * FROM properties 
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );
      
      // 獲取每個物業的房間統計
      const propertiesWithStats = await Promise.all(
        properties.map(async (property) => {
          const stats = await queryOne<{
            total_rooms: string;
            available_rooms: string;
            occupied_rooms: string;
            maintenance_rooms: string;
            total_rent: string;
            total_deposit: string;
          }>(
            `SELECT 
              COUNT(*) as total_rooms,
              COUNT(CASE WHEN status = 'available' THEN 1 END) as available_rooms,
              COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_rooms,
              COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_rooms,
              COALESCE(SUM(monthly_rent), 0) as total_rent,
              COALESCE(SUM(deposit), 0) as total_deposit
             FROM rooms 
             WHERE property_id = $1`,
            [property.id]
          );
          
          return {
            ...property,
            stats: {
              total_rooms: parseInt(stats?.total_rooms || '0'),
              available_rooms: parseInt(stats?.available_rooms || '0'),
              occupied_rooms: parseInt(stats?.occupied_rooms || '0'),
              maintenance_rooms: parseInt(stats?.maintenance_rooms || '0'),
              total_rent: parseInt(stats?.total_rent || '0'),
              total_deposit: parseInt(stats?.total_deposit || '0'),
            },
          };
        })
      );
      
      res.json({
        success: true,
        data: {
          properties: propertiesWithStats,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
        message: '獲取物業列表成功',
      });
    } catch (error) {
      logger.error('獲取物業列表失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '獲取物業列表失敗',
      });
    }
  }
);

/**
 * @route GET /properties/:id
 * @description 獲取單個物業詳情
 * @access 需要認證
 */
router.get(
  '/properties/:id',
  authenticate,
  async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      
      const property = await queryOne(
        'SELECT * FROM properties WHERE id = $1',
        [propertyId]
      );
      
      if (!property) {
        return res.status(404).json({
          success: false,
          error: '物業不存在',
          message: '指定的物業不存在',
        });
      }
      
      // 獲取物業統計
      const stats = await queryOne<{
        total_rooms: string;
        available_rooms: string;
        occupied_rooms: string;
        maintenance_rooms: string;
        total_rent: string;
        total_deposit: string;
        total_tenants: string;
      }>(
        `SELECT 
          COUNT(*) as total_rooms,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as available_rooms,
          COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_rooms,
          COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_rooms,
          COALESCE(SUM(monthly_rent), 0) as total_rent,
          COALESCE(SUM(deposit), 0) as total_deposit,
          COUNT(DISTINCT tenant_name) as total_tenants
         FROM rooms 
         WHERE property_id = $1`,
        [propertyId]
      );
      
      // 獲取最近活動
      const recentActivities = await query(
        `SELECT 
          ol.action_type,
          ol.resource_type,
          ol.details,
          ol.created_at,
          u.username as user_username,
          u.full_name as user_full_name
         FROM operation_logs ol
         LEFT JOIN users u ON ol.user_id = u.id
         WHERE (ol.resource_type = 'property' AND ol.resource_id = $1)
            OR (ol.resource_type = 'room' AND ol.resource_id IN (
              SELECT id FROM rooms WHERE property_id = $1
            ))
         ORDER BY ol.created_at DESC
         LIMIT 10`,
        [propertyId]
      );
      
      // 獲付款統計（最近6個月）
      const paymentStats = await query(
        `SELECT 
          p.month,
          COUNT(*) as payment_count,
          SUM(p.total_amount) as total_amount,
          SUM(CASE WHEN p.payment_type = 'rent' THEN p.total_amount ELSE 0 END) as rent_amount,
          SUM(CASE WHEN p.payment_type = 'electricity' THEN p.total_amount ELSE 0 END) as electricity_amount,
          SUM(CASE WHEN p.payment_type = 'deposit' THEN p.total_amount ELSE 0 END) as deposit_amount
         FROM payments p
         JOIN rooms r ON p.room_id = r.id
         WHERE r.property_id = $1
           AND p.status = 'paid'
           AND p.month >= TO_CHAR(CURRENT_DATE - INTERVAL '6 months', 'YYYY/MM')
         GROUP BY p.month
         ORDER BY p.month DESC`,
        [propertyId]
      );
      
      const propertyWithDetails = {
        ...property,
        stats: {
          total_rooms: parseInt(stats?.total_rooms || '0'),
          available_rooms: parseInt(stats?.available_rooms || '0'),
          occupied_rooms: parseInt(stats?.occupied_rooms || '0'),
          maintenance_rooms: parseInt(stats?.maintenance_rooms || '0'),
          total_rent: parseInt(stats?.total_rent || '0'),
          total_deposit: parseInt(stats?.total_deposit || '0'),
          total_tenants: parseInt(stats?.total_tenants || '0'),
        },
        recent_activities: recentActivities,
        payment_stats: paymentStats,
      };
      
      res.json({
        success: true,
        data: { property: propertyWithDetails },
        message: '獲取物業詳情成功',
      });
    } catch (error) {
      logger.error('獲取物業詳情失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '獲取物業詳情失敗',
      });
    }
  }
);

/**
 * @route PUT /properties/:id
 * @description 更新物業信息
 * @access 需要管理員權限
 */
router.put(
  '/properties/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  validateRequest(updatePropertySchema),
  async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const updateData = req.body;
      const currentUser = req.user!;
      
      // 檢查物業是否存在
      const existingProperty = await queryOne(
        'SELECT id, name FROM properties WHERE id = $1',
        [propertyId]
      );
      
      if (!existingProperty) {
        return res.status(404).json({
          success: false,
          error: '物業不存在',
          message: '指定的物業不存在',
        });
      }
      
      // 如果更新名稱，檢查是否與其他物業衝突
      if (updateData.name && updateData.name !== existingProperty.name) {
        const nameExists = await queryOne(
          'SELECT id FROM properties WHERE name = $1 AND id != $2',
          [updateData.name, propertyId]
        );
        
        if (nameExists) {
          return res.status(409).json({
            success: false,
            error: '物業名稱已存在',
            message: '物業名稱已存在，請使用其他名稱',
          });
        }
      }
      
      // 構建更新語句
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          setClauses.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      });
      
      // 如果沒有要更新的字段
      if (setClauses.length === 0) {
        return res.status(400).json({
          success: false,
          error: '無效的更新',
          message: '沒有提供有效的更新字段',
        });
      }
      
      // 添加更新時間
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      
      params.push(propertyId);
      
      // 執行更新
      await query(
        `UPDATE properties SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        params
      );
      
      // 獲取更新後的物業信息
      const updatedProperty = await queryOne(
        'SELECT * FROM properties WHERE id = $1',
        [propertyId]
      );
      
      // 記錄操作日誌
      await query(
        `INSERT INTO operation_logs (user_id, action_type, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          currentUser.userId,
          'update_property',
          'property',
          propertyId,
          JSON.stringify({
            updatedFields: Object.keys(updateData),
            oldName: existingProperty.name,
            newName: updateData.name || existingProperty.name,
          }),
        ]
      );
      
      logger.info(`更新物業成功: ${currentUser.username} -> 物業 ${propertyId}`);
      
      res.json({
        success: true,
        data: { property: updatedProperty },
        message: '更新物業成功',
      });
    } catch (error) {
      logger.error('更新物業失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '更新物業失敗',
      });
    }
  }
);

/**
 * @route DELETE /properties/:id
 * @description 刪除物業（需要確認）
 * @access 需要超級管理員權限
 */
router.delete(
  '/properties/:id',
  authenticate,
  authorize('super_admin'),
  async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const currentUser = req.user!;
      
      // 檢查物業是否存在
      const existingProperty = await queryOne(
        'SELECT id, name FROM properties WHERE id = $1',
        [propertyId]
      );
      
      if (!existingProperty) {
        return res.status(404).json({
          success: false,
          error: '物業不存在',
          message: '指定的物業不存在',
        });
      }
      
      // 檢查物業是否有房間
      const roomCount = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM rooms WHERE property_id = $1',
        [propertyId]
      );
      
      const hasRooms = parseInt(roomCount?.count || '0') > 0;
      
      if (hasRooms) {
        return res.status(400).json({
          success: false,
          error: '無法刪除',
          message: '物業中還有房間，請先刪除或轉移所有房間',
          data: {
            room_count: parseInt(roomCount?.count || '0'),
          },
        });
      }
      
      // 執行刪除
      await query('DELETE FROM properties WHERE id = $1', [propertyId]);
      
      // 記錄操作日誌
      await query(
        `INSERT INTO operation_logs (user_id, action_type, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          currentUser.userId,
          'delete_property',
          'property',
          propertyId,
          JSON.stringify({
            property_name: existingProperty.name,
          }),
        ]
      );
      
      logger.info(`刪除物業成功: ${currentUser.username} -> 物業 ${propertyId} (${existingProperty.name})`);
      
      res.json({
        success: true,
        message: '刪除物業成功',
      });
    } catch (error) {
      logger.error('刪除物業失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '刪除物業失敗',
      });
    }
  }
);

/**
 * @route GET /properties/:id/rooms
 * @description 獲取物業的所有房間
 * @access 需要認證
 */
router.get(
  '/properties/:id/rooms',
  authenticate,
  async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const { status, floor, available_only } = req.query;
      
      // 檢查物業是否存在
      const propertyExists = await queryOne(
        'SELECT id FROM properties WHERE id = $1',
        [propertyId]
      );
      
      if (!propertyExists) {
        return res.status(404).json({
          success: false,
          error: '物業不存在',
          message: '指定的物業不存在',
        });
      }
      
      // 構建查詢條件
      let whereClause = 'WHERE property_id = $1';
      const params: any[] = [propertyId];
      let paramIndex = 2;
      
      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (floor) {
        whereClause += ` AND floor = $${paramIndex}`;
        params.push(floor);
        paramIndex++;
      }
      
      if (available_only === 'true') {
        whereClause += ` AND status = 'available'`;
      }
      
      // 獲取房間列表
      const rooms = await query(
        `SELECT * FROM rooms 
         ${whereClause}
         ORDER BY floor, room_number`,
        params
      );
      
      res.json({
        success: true,
        data: { rooms },
        message: '獲取房間列表成功',
      });
    } catch (error) {
      logger.error('獲取房間列表失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '獲取房間列表失敗',
      });
    }
  }
);

export default router;
