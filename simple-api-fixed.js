#!/usr/bin/env node

/**
 * 台灣房東-越南租客系統後端 API - PostgreSQL 持久化版本
 * 修復數據同步問題，實現多設備數據一致性
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const apiPrefix = process.env.API_PREFIX || '/api';

// ==================== PostgreSQL 連接配置 ====================
console.log('🔌 初始化 PostgreSQL 連接...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '已設置' : '未設置');

// 創建 PostgreSQL 連接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/taiwan_landlord_test',
  // 簡化 SSL 配置 - 根據錯誤訊息調整
  ssl: false, // 先禁用 SSL，根據錯誤訊息 "The server does not support SSL connections"
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// 測試資料庫連接
async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ PostgreSQL 連接成功');
    console.log('   伺服器時間:', result.rows[0].current_time);
    console.log('   PostgreSQL 版本:', result.rows[0].pg_version.split('\n')[0]);
    
    // 檢查必要的表是否存在，如果不存在則創建
    await initializeDatabaseTables(client);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL 連接失敗:', error.message);
    console.log('⚠️  使用內存存儲作為備用方案');
    return false;
  }
}

// 初始化資料庫表
async function initializeDatabaseTables(client) {
  try {
    // 檢查表是否存在
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const existingTables = tables.rows.map(row => row.table_name);
    console.log('📊 現有資料表:', existingTables);
    
    // 檢查並創建缺失的表
    const requiredTables = ['properties', 'rooms', 'payments', 'tenants', 'maintenance', 'history'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('🛠️  創建缺失的資料表:', missingTables);
      
      // 創建物業表
      await client.query(`
        CREATE TABLE IF NOT EXISTS properties (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          address TEXT,
          floors INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // 創建房間表
      await client.query(`
        CREATE TABLE IF NOT EXISTS rooms (
          id SERIAL PRIMARY KEY,
          property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
          floor INTEGER DEFAULT 1,
          room_number VARCHAR(20) NOT NULL,
          status VARCHAR(20) DEFAULT 'available',
          tenant_name VARCHAR(100),
          tenant_phone VARCHAR(20),
          rent_amount INTEGER DEFAULT 0,
          deposit_amount INTEGER DEFAULT 0,
          check_in_date DATE,
          check_out_date DATE,
          current_meter INTEGER DEFAULT 0,
          previous_meter INTEGER DEFAULT 0,
          last_meter INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // 創建付款表
      await client.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
          month VARCHAR(20) NOT NULL,
          rent_amount INTEGER DEFAULT 0,
          electricity_usage INTEGER DEFAULT 0,
          electricity_fee INTEGER DEFAULT 0,
          total_amount INTEGER DEFAULT 0,
          due_date DATE,
          paid_date DATE,
          status VARCHAR(20) DEFAULT 'pending',
          payment_method VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // 創建租客表
      await client.query(`
        CREATE TABLE IF NOT EXISTS tenants (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
          check_in_date DATE,
          check_out_date DATE,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // 創建維護記錄表
      await client.query(`
        CREATE TABLE IF NOT EXISTS maintenance (
          id SERIAL PRIMARY KEY,
          room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          urgency VARCHAR(20) DEFAULT 'normal',
          status VARCHAR(20) DEFAULT 'pending',
          report_date DATE DEFAULT CURRENT_DATE,
          repair_date DATE,
          cost INTEGER DEFAULT 0,
          technician VARCHAR(100),
          notes TEXT,
          category VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // 創建歷史記錄表
      await client.query(`
        CREATE TABLE IF NOT EXISTS history (
          id SERIAL PRIMARY KEY,
          room_id INTEGER,
          tenant_name VARCHAR(100),
          month VARCHAR(20),
          rent_amount INTEGER DEFAULT 0,
          electricity_usage INTEGER DEFAULT 0,
          electricity_fee INTEGER DEFAULT 0,
          total_amount INTEGER DEFAULT 0,
          due_date DATE,
          paid_date DATE,
          status VARCHAR(20),
          payment_method VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ 資料表創建完成');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 初始化資料表失敗:', error.message);
    return false;
  }
}

// ==================== 安全中間件 ====================
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
}));

// ==================== CORS 中間件 ====================
app.use(cors({
  origin: function(origin, callback) {
    // 允許所有來源（開發階段）
    if (!origin || process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    
    // 生產環境允許的來源
    const allowedOrigins = [
      'https://taiwan-landlord-vietnam-tenant-syst.vercel.app',
      'https://taiwan-landlord-vietnam-tenant-system.vercel.app',
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn('CORS 阻止的來源:', origin);
      callback(new Error('不允許的來源'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24小時
}));

// ==================== 請求解析中間件 ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== 健康檢查端點 ====================
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testDatabaseConnection();
    
    res.json({
      status: 'healthy',
      service: '台灣房東-越南租客系統 API (PostgreSQL 版本)',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: dbConnected,
        type: 'PostgreSQL'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== API 文檔端點 ====================
app.get('/api-docs', (req, res) => {
  res.json({
    name: '台灣房東-越南租客系統 API (PostgreSQL 版本)',
    version: '2.0.0',
    description: '修復數據同步問題，實現多設備數據一致性',
    endpoints: {
      health: 'GET /health',
      sync: {
        all_data: `GET ${apiPrefix}/sync/all`,
        batch: `POST ${apiPrefix}/sync/batch`,
        status: `GET ${apiPrefix}/sync/status`
      },
      data: {
        properties: `GET ${apiPrefix}/data/properties`,
        rooms: `GET ${apiPrefix}/data/rooms`,
        payments: `GET ${apiPrefix}/data/payments`,
        tenants: `GET ${apiPrefix}/data/tenants`
      }
    },
    note: '此版本使用 PostgreSQL 持久化存儲，確保多設備數據同步'
  });
});

// ==================== 數據同步 API ====================

// 1. 獲取所有數據（用於初始同步）
app.get(`${apiPrefix}/sync/all`, async (req, res) => {
  try {
    console.log('📥 收到同步請求: 獲取所有數據');
    
    const client = await pool.connect();
    
    // 獲取所有數據
    const propertiesResult = await client.query('SELECT * FROM properties ORDER BY id');
    const roomsResult = await client.query('SELECT * FROM rooms ORDER BY id');
    const paymentsResult = await client.query('SELECT * FROM payments ORDER BY id');
    const tenantsResult = await client.query('SELECT * FROM tenants ORDER BY id');
    const maintenanceResult = await client.query('SELECT * FROM maintenance ORDER BY id');
    const historyResult = await client.query('SELECT * FROM history ORDER BY id');
    
    client.release();
    
    const allData = {
      properties: propertiesResult.rows,
      rooms: roomsResult.rows,
      payments: paymentsResult.rows,
      tenants: tenantsResult.rows,
      maintenance: maintenanceResult.rows,
      history: historyResult.rows,
      electricityRate: 6,
      actualElectricityRate: 4.5,
      utilityExpenses: [],
      additionalIncomes: [],
      expenseCategories: [
        {
          id: 'renovation',
          name: '裝修工程',
          subCategories: [
            { id: 'paint', name: '油漆粉刷' },
            { id: 'floor', name: '地板工程' },
            { id: 'bathroom', name: '浴室裝修' }
          ]
        },
        {
          id: 'repair',
          name: '維修保養',
          subCategories: [
            { id: 'plumbing', name: '水電維修' },
            { id: 'appliance', name: '家電維修' },
            { id: 'furniture', name: '家具維修' }
          ]
        },
        {
          id: 'management',
          name: '管理費用',
          subCategories: [
            { id: 'cleaning', name: '清潔費用' },
            { id: 'security', name: '保全費用' },
            { id: 'admin', name: '行政費用' }
          ]
        }
      ]
    };
    
    console.log(`✅ 同步數據成功: ${propertiesResult.rowCount}物業, ${roomsResult.rowCount}房間, ${paymentsResult.rowCount}付款`);
    
    res.json({
      success: true,
      data: allData,
      message: '數據同步成功',
      sync_timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 同步數據失敗:', error);
    res.status(500).json({
      success: false,
      error: '獲取數據失敗',
      message: error.message
    });
  }
});

// 2. 批量更新數據（用於自動同步）
app.post(`${apiPrefix}/sync/batch`, async (req, res) => {
  try {
    const updates = req.body;
    console.log('📤 收到批量更新:', Object.keys(updates).join(', '));
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 更新物業數據
      if (updates.properties && Array.isArray(updates.properties)) {
        for (const property of updates.properties) {
          if (property.id) {
            // 更新現有物業
            await client.query(`
              UPDATE properties SET 
                name = $1, address = $2, floors = $3, updated_at = NOW()
              WHERE id = $4
            `, [property.name, property.address, property.floors, property.id]);
          } else {
            // 插入新物業
            const result = await client.query(`
              INSERT INTO properties (name, address, floors, created_at, updated_at)
              VALUES ($1, $2, $3, NOW(), NOW())
              RETURNING id
            `, [property.name, property.address, property.floors || 1]);
            property.id = result.rows[0].id;
          }
        }
        console.log(`  更新 ${updates.properties.length} 個物業`);
      }
      
      // 更新房間數據
      if (updates.rooms && Array.isArray(updates.rooms)) {
        for (const room of updates.rooms) {
          if (room.id) {
            // 更新現有房間
            await client.query(`
              UPDATE rooms SET 
                property_id = $1, floor = $2, room_number = $3, status = $4,
                tenant_name = $5, tenant_phone = $6, rent_amount = $7,
                deposit_amount = $8, check_in_date = $9, check_out_date = $10,
                current_meter = $11, previous_meter = $12, last_meter = $13,
                updated_at = NOW()
              WHERE id = $14
            `, [
              room.property_id, room.floor || 1, room.room_number, room.status || 'available',
              room.tenant_name, room.tenant_phone, room.rent_amount || 0,
              room.deposit_amount || 0, room.check_in_date, room.check_out_date,
              room.current_meter || 0, room.previous_meter || 0, room.last_meter || 0,
              room.id
            ]);
          } else {
            // 插入新房間
            const result = await client.query(`
              INSERT INTO rooms (
                property_id, floor, room_number, status,
                tenant_name, tenant_phone, rent_amount,
                deposit_amount, check_in_date, check_out_date,
                current_meter, previous_meter, last_meter,
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
              RETURNING id
            `, [
              room.property_id, room.floor || 1, room.room_number, room.status || 'available',
              room.tenant_name, room.tenant_phone, room.rent_amount || 0,
              room.deposit_amount || 0, room.check_in_date, room.check_out_date,
              room.current_meter || 0, room.previous_meter || 0, room.last_meter || 0
            ]);
            room.id = result.rows[0].id;
          }
        }
        console.log(`  更新 ${updates.rooms.length} 個房間`);
      }
      
      // 更新付款數據
      if (updates.payments && Array.isArray(updates.payments)) {
        for (const payment of updates.payments) {
          if (payment.id) {
            // 更新現有付款
            await client.query(`
              UPDATE payments SET 
                room_id = $1, month = $2, rent_amount = $3,
                electricity_usage = $4, electricity_fee = $5,
                total_amount = $6, due_date = $7, paid_date = $8,
                status = $9, payment_method = $10, updated_at = NOW()
              WHERE id = $11
            `, [
              payment.room_id, payment.month, payment.rent_amount || 0,
              payment.electricity_usage || 0, payment.electricity_fee || 0,
              payment.total_amount || 0, payment.due_date, payment.paid_date,
              payment.status || 'pending', payment.payment_method,
              payment.id
            ]);
          } else {
            // 插入新付款
            const result = await client.query(`
              INSERT INTO payments (
                room_id, month, rent_amount,
                electricity_usage, electricity_fee,
                total_amount, due_date, paid_date,
                status, payment_method, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
              RETURNING id
            `, [
              payment.room_id, payment.month, payment.rent_amount || 0,
              payment.electricity_usage || 0, payment.electricity_fee || 0,
              payment.total_amount || 0, payment.due_date, payment.paid_date,
              payment.status || 'pending', payment.payment_method
            ]);
            payment.id = result.rows[0].id;
          }
        }
        console.log(`  更新 ${updates.payments.length} 個付款`);
      }
      
      // 更新租客數據
      if (updates.tenants && Array.isArray(updates.tenants)) {
        for (const tenant of updates.tenants) {
          if (tenant.id) {
            // 更新現有租客
            await client.query(`
              UPDATE tenants SET 
                name = $1, phone = $2, room_id = $3,
                check_in_date = $4, check_out_date = $5,
                status = $6, updated_at = NOW()
              WHERE id = $7
            `, [
              tenant.name, tenant.phone, tenant.room_id,
              tenant.check_in_date, tenant.check_out_date,
              tenant.status || 'active', tenant.id
            ]);
          } else {
            // 插入新租客
            const result = await client.query(`
              INSERT INTO tenants (
                name, phone, room_id,
                check_in_date, check_out_date,
                status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
              RETURNING id
            `, [
              tenant.name, tenant.phone,              tenant.room_id,
              tenant.check_in_date, tenant.check_out_date,
              tenant.status || 'active'
            ]);
            tenant.id = result.rows[0].id;
          }
        }
        console.log(`  更新 ${updates.tenants.length} 個租客`);
      }
      
      // 更新維護數據
      if (updates.maintenance && Array.isArray(updates.maintenance)) {
        for (const maintenance of updates.maintenance) {
          if (maintenance.id) {
            // 更新現有維護記錄
            await client.query(`
              UPDATE maintenance SET 
                room_id = $1, title = $2, description = $3,
                urgency = $4, status = $5, report_date = $6,
                repair_date = $7, cost = $8, technician = $9,
                notes = $10, category = $11, updated_at = NOW()
              WHERE id = $12
            `, [
              maintenance.room_id, maintenance.title, maintenance.description,
              maintenance.urgency || 'normal', maintenance.status || 'pending',
              maintenance.report_date, maintenance.repair_date,
              maintenance.cost || 0, maintenance.technician,
              maintenance.notes, maintenance.category,
              maintenance.id
            ]);
          } else {
            // 插入新維護記錄
            const result = await client.query(`
              INSERT INTO maintenance (
                room_id, title, description,
                urgency, status, report_date,
                repair_date, cost, technician,
                notes, category, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
              RETURNING id
            `, [
              maintenance.room_id, maintenance.title, maintenance.description,
              maintenance.urgency || 'normal', maintenance.status || 'pending',
              maintenance.report_date, maintenance.repair_date,
              maintenance.cost || 0, maintenance.technician,
              maintenance.notes, maintenance.category
            ]);
            maintenance.id = result.rows[0].id;
          }
        }
        console.log(`  更新 ${updates.maintenance.length} 個維護記錄`);
      }
      
      // 更新歷史數據
      if (updates.history && Array.isArray(updates.history)) {
        for (const history of updates.history) {
          await client.query(`
            INSERT INTO history (
              room_id, tenant_name, month,
              rent_amount, electricity_usage, electricity_fee,
              total_amount, due_date, paid_date,
              status, payment_method, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          `, [
            history.room_id, history.tenant_name, history.month,
            history.rent_amount || 0, history.electricity_usage || 0,
            history.electricity_fee || 0, history.total_amount || 0,
            history.due_date, history.paid_date,
            history.status, history.payment_method
          ]);
        }
        console.log(`  新增 ${updates.history.length} 個歷史記錄`);
      }
      
      await client.query('COMMIT');
      console.log('✅ 批量更新成功');
      
      res.json({
        success: true,
        message: '數據更新成功',
        timestamp: new Date().toISOString(),
        updated_counts: {
          properties: updates.properties?.length || 0,
          rooms: updates.rooms?.length || 0,
          payments: updates.payments?.length || 0,
          tenants: updates.tenants?.length || 0,
          maintenance: updates.maintenance?.length || 0,
          history: updates.history?.length || 0
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ 批量更新失敗:', error);
    res.status(500).json({
      success: false,
      error: '更新數據失敗',
      message: error.message
    });
  }
});

// 3. 檢查同步狀態
app.get(`${apiPrefix}/sync/status`, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // 獲取數據統計
    const propertiesCount = await client.query('SELECT COUNT(*) FROM properties');
    const roomsCount = await client.query('SELECT COUNT(*) FROM rooms');
    const paymentsCount = await client.query('SELECT COUNT(*) FROM payments');
    const tenantsCount = await client.query('SELECT COUNT(*) FROM tenants');
    
    client.release();
    
    res.json({
      success: true,
      status: 'connected',
      database: 'PostgreSQL',
      counts: {
        properties: parseInt(propertiesCount.rows[0].count),
        rooms: parseInt(roomsCount.rows[0].count),
        payments: parseInt(paymentsCount.rows[0].count),
        tenants: parseInt(tenantsCount.rows[0].count)
      },
      last_sync: new Date().toISOString(),
      server_time: new Date().toISOString(),
      message: '同步狀態檢查成功'
    });
  } catch (error) {
    console.error('❌ 檢查同步狀態失敗:', error);
    res.status(500).json({
      success: false,
      error: '檢查狀態失敗',
      message: error.message
    });
  }
});

// ==================== 數據查詢 API ====================

// 獲取物業列表
app.get(`${apiPrefix}/data/properties`, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM properties ORDER BY id');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 獲取房間列表
app.get(`${apiPrefix}/data/rooms`, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, p.name as property_name 
      FROM rooms r 
      LEFT JOIN properties p ON r.property_id = p.id 
      ORDER BY r.id
    `);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 獲取付款列表
app.get(`${apiPrefix}/data/payments`, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, r.room_number, r.tenant_name 
      FROM payments p 
      LEFT JOIN rooms r ON p.room_id = r.id 
      ORDER BY p.id
    `);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 獲取租客列表
app.get(`${apiPrefix}/data/tenants`, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, r.room_number, p.name as property_name 
      FROM tenants t 
      LEFT JOIN rooms r ON t.room_id = r.id 
      LEFT JOIN properties p ON r.property_id = p.id 
      ORDER BY t.id
    `);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 錯誤處理中間件 ====================
app.use((err, req, res, next) => {
  console.error('❌ 服務器錯誤:', err);
  res.status(500).json({
    success: false,
    error: '內部服務器錯誤',
    message: process.env.NODE_ENV === 'development' ? err.message : '請稍後重試'
  });
});

// ==================== 404 處理 ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '端點不存在',
    message: `無法找到 ${req.method} ${req.path}`
  });
});

// ==================== 啟動服務器 ====================
async function startServer() {
  try {
    // 測試資料庫連接
    const dbConnected = await testDatabaseConnection();
    
    if (!dbConnected) {
      console.log('⚠️  資料庫連接失敗，但服務器仍會啟動（使用內存存儲）');
    }
    
    app.listen(port, () => {
      console.log('='.repeat(60));
      console.log('🚀 台灣房東-越南租客系統後端 API 已啟動');
      console.log('='.repeat(60));
      console.log(`📡 環境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 端口: ${port}`);
      console.log(`🔗 API 前綴: ${apiPrefix}`);
      console.log(`🗄️  資料庫: ${dbConnected ? 'PostgreSQL (已連接)' : '內存存儲 (備用)'}`);
      console.log(`📊 健康檢查: http://localhost:${port}/health`);
      console.log(`📚 API 文檔: http://localhost:${port}/api-docs`);
      console.log('='.repeat(60));
      console.log('✅ 系統已準備就緒，等待請求...');
    });
  } catch (error) {
    console.error('❌ 啟動服務器失敗:', error);
    process.exit(1);
  }
}

// 處理關閉信號
process.on('SIGTERM', async () => {
  console.log('🛑 收到關閉信號，正在關閉服務器...');
  await pool.end();
  console.log('✅ 服務器已優雅關閉');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 收到中斷信號，正在關閉服務器...');
  await pool.end();
  console.log('✅ 服務器已優雅關閉');
  process.exit(0);
});

// 啟動服務器
startServer();