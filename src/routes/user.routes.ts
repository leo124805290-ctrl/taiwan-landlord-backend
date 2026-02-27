import { Request, Response } from 'express';
import express from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db';
import { authenticate, authorize, validateRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { UserRole, UserStatus } from '../types';

const router = express.Router();

// 獲取用戶列表驗證 schema
const getUsersSchema = z.object({
  query: z.object({
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).optional().default('20'),
    role: z.enum(['super_admin', 'admin', 'viewer']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    search: z.string().optional(),
  }),
});

// 更新用戶驗證 schema
const updateUserSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    full_name: z.string().optional(),
    email: z.string().email('無效的郵箱格式').optional(),
    phone: z.string().optional(),
    role: z.enum(['super_admin', 'admin', 'viewer']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
  }),
});

/**
 * @route GET /users
 * @description 獲取用戶列表（分頁）
 * @access 需要超級管理員權限
 */
router.get(
  '/users',
  authenticate,
  authorize('super_admin'),
  validateRequest(getUsersSchema),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, role, status, search } = req.query;
      const offset = (page - 1) * limit;
      
      // 構建查詢條件
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (role) {
        whereClause += ` AND role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }
      
      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (search) {
        whereClause += ` AND (
          username ILIKE $${paramIndex} OR 
          full_name ILIKE $${paramIndex} OR 
          email ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      // 獲取總數
      const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM users ${whereClause}`,
        params
      );
      
      const total = parseInt(countResult?.count || '0');
      const totalPages = Math.ceil(total / limit);
      
      // 獲取用戶列表
      const users = await query(
        `SELECT 
          id, username, role, full_name, email, phone, status, 
          last_login, created_at, updated_at
         FROM users 
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );
      
      // 移除密碼哈希等敏感信息
      const safeUsers = users.map(user => ({
        ...user,
        // 確保沒有敏感字段
      }));
      
      res.json({
        success: true,
        data: {
          users: safeUsers,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
        message: '獲取用戶列表成功',
      });
    } catch (error) {
      logger.error('獲取用戶列表失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '獲取用戶列表失敗',
      });
    }
  }
);

/**
 * @route GET /users/:id
 * @description 獲取單個用戶信息
 * @access 需要超級管理員權限，或用戶查看自己的信息
 */
router.get(
  '/users/:id',
  authenticate,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user!;
      
      // 檢查權限：超級管理員可以查看所有，其他用戶只能查看自己
      if (currentUser.role !== 'super_admin' && currentUser.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: '權限不足',
          message: '您只能查看自己的信息',
        });
      }
      
      const user = await queryOne(
        `SELECT 
          id, username, role, full_name, email, phone, status, 
          last_login, created_at, updated_at
         FROM users 
         WHERE id = $1`,
        [userId]
      );
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用戶不存在',
          message: '指定的用戶不存在',
        });
      }
      
      res.json({
        success: true,
        data: { user },
        message: '獲取用戶信息成功',
      });
    } catch (error) {
      logger.error('獲取用戶信息失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '獲取用戶信息失敗',
      });
    }
  }
);

/**
 * @route PUT /users/:id
 * @description 更新用戶信息
 * @access 需要超級管理員權限，或用戶更新自己的信息（有限字段）
 */
router.put(
  '/users/:id',
  authenticate,
  validateRequest(updateUserSchema),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user!;
      const updateData = req.body;
      
      // 檢查用戶是否存在
      const existingUser = await queryOne(
        'SELECT id, role FROM users WHERE id = $1',
        [userId]
      );
      
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: '用戶不存在',
          message: '指定的用戶不存在',
        });
      }
      
      // 權限檢查
      let canUpdate = false;
      let allowedFields: string[] = [];
      
      if (currentUser.role === 'super_admin') {
        // 超級管理員可以更新所有字段
        canUpdate = true;
        allowedFields = ['full_name', 'email', 'phone', 'role', 'status'];
      } else if (currentUser.userId === userId) {
        // 用戶只能更新自己的基本信息，不能修改角色和狀態
        canUpdate = true;
        allowedFields = ['full_name', 'email', 'phone'];
        
        // 移除不允許的字段
        delete updateData.role;
        delete updateData.status;
      }
      
      if (!canUpdate) {
        return res.status(403).json({
          success: false,
          error: '權限不足',
          message: '您沒有權限更新此用戶',
        });
      }
      
      // 過濾只允許的字段
      const filteredUpdateData: any = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredUpdateData[field] = updateData[field];
        }
      });
      
      // 如果沒有要更新的字段
      if (Object.keys(filteredUpdateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: '無效的更新',
          message: '沒有提供有效的更新字段',
        });
      }
      
      // 構建更新語句
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      Object.entries(filteredUpdateData).forEach(([key, value]) => {
        setClauses.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      });
      
      // 添加更新時間
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      
      params.push(userId);
      
      // 執行更新
      await query(
        `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        params
      );
      
      // 獲取更新後的用戶信息
      const updatedUser = await queryOne(
        `SELECT 
          id, username, role, full_name, email, phone, status, 
          last_login, created_at, updated_at
         FROM users 
         WHERE id = $1`,
        [userId]
      );
      
      // 記錄操作日誌
      await query(
        `INSERT INTO operation_logs (user_id, action_type, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          currentUser.userId,
          'update_user',
          'user',
          userId,
          JSON.stringify({
            updatedFields: Object.keys(filteredUpdateData),
            oldRole: existingUser.role,
            newRole: filteredUpdateData.role || existingUser.role,
          }),
        ]
      );
      
      logger.info(`用戶信息更新: ${currentUser.username} -> 用戶 ${userId}`, {
        updatedFields: Object.keys(filteredUpdateData),
      });
      
      res.json({
        success: true,
        data: { user: updatedUser },
        message: '更新用戶信息成功',
      });
    } catch (error) {
      logger.error('更新用戶信息失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '更新用戶信息失敗',
      });
    }
  }
);

/**
 * @route DELETE /users/:id
 * @description 刪除用戶（標記為停用）
 * @access 需要超級管理員權限
 */
router.delete(
  '/users/:id',
  authenticate,
  authorize('super_admin'),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user!;
      
      // 檢查用戶是否存在
      const existingUser = await queryOne(
        'SELECT id, username, role FROM users WHERE id = $1',
        [userId]
      );
      
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: '用戶不存在',
          message: '指定的用戶不存在',
        });
      }
      
      // 不能刪除自己
      if (currentUser.userId === userId) {
        return res.status(400).json({
          success: false,
          error: '操作不允許',
          message: '不能刪除自己的帳號',
        });
      }
      
      // 將用戶標記為停用（軟刪除）
      await query(
        'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['inactive', userId]
      );
      
      // 記錄操作日誌
      await query(
        `INSERT INTO operation_logs (user_id, action_type, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          currentUser.userId,
          'delete_user',
          'user',
          userId,
          JSON.stringify({
            deletedUsername: existingUser.username,
            deletedRole: existingUser.role,
          }),
        ]
      );
      
      logger.info(`用戶停用: ${currentUser.username} -> 用戶 ${userId} (${existingUser.username})`);
      
      res.json({
        success: true,
        message: '用戶已停用',
      });
    } catch (error) {
      logger.error('停用用戶失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '停用用戶失敗',
      });
    }
  }
);

/**
 * @route GET /users/:id/login-logs
 * @description 獲取用戶登入記錄
 * @access 需要超級管理員權限
 */
router.get(
  '/users/:id/login-logs',
  authenticate,
  authorize('super_admin'),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      
      // 檢查用戶是否存在
      const userExists = await queryOne(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );
      
      if (!userExists) {
        return res.status(404).json({
          success: false,
          error: '用戶不存在',
          message: '指定的用戶不存在',
        });
      }
      
      // 獲取總數
      const countResult = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM login_logs WHERE user_id = $1',
        [userId]
      );
      
      const total = parseInt(countResult?.count || '0');
      const totalPages = Math.ceil(total / limit);
      
      // 獲取登入記錄
      const logs = await query(
        `SELECT * FROM login_logs 
         WHERE user_id = $1 
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      
      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
        message: '獲取登入記錄成功',
      });
    } catch (error) {
      logger.error('獲取登入記錄失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '獲取登入記錄失敗',
      });
    }
  }
);

export default router;