#!/usr/bin/env node

/**
 * 台灣房東-越南租客系統後端 API - 簡單純 JavaScript 版本
 * 作為 TypeScript 編譯失敗時的備用方案
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const apiPrefix = process.env.API_PREFIX || '/api';

// 安全中間件
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
}));

// CORS 中間件
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// 請求解析中間件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 簡單日誌中間件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: '台灣房東-越南租客系統 API (簡單版本)',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    note: '這是簡單版本，完整功能請確保 TypeScript 編譯成功'
  });
});

// API 文檔端點
app.get('/api-docs', (req, res) => {
  res.json({
    name: '台灣房東-越南租客系統 API (簡單版本)',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      api_docs: 'GET /api-docs',
      auth: {
        register: `POST ${apiPrefix}/auth/register`,
        login: `POST ${apiPrefix}/auth/login`,
        profile: `GET ${apiPrefix}/auth/profile`
      },
      users: {
        list: `GET ${apiPrefix}/users`,
        get: `GET ${apiPrefix}/users/:id`,
        update: `PUT ${apiPrefix}/users/:id`,
        delete: `DELETE ${apiPrefix}/users/:id`
      },
      properties: {
        list: `GET ${apiPrefix}/properties`,
        create: `POST ${apiPrefix}/properties`,
        get: `GET ${apiPrefix}/properties/:id`,
        update: `PUT ${apiPrefix}/properties/:id`,
        delete: `DELETE ${apiPrefix}/properties/:id`
      },
      backup: {
        schedules: {
          list: `GET ${apiPrefix}/backup/schedules`,
          create: `POST ${apiPrefix}/backup/schedules`,
          update: `PUT ${apiPrefix}/backup/schedules/:id`,
          delete: `DELETE ${apiPrefix}/backup/schedules/:id`
        },
        execute: `POST ${apiPrefix}/backup/execute`,
        history: `GET ${apiPrefix}/backup/history`
      }
    },
    note: '這是簡單版本，實際端點可能因 TypeScript 編譯狀態而異'
  });
});

// 簡單的身份驗證端點（模擬）
app.post(`${apiPrefix}/auth/register`, (req, res) => {
  res.json({
    success: true,
    message: '註冊功能在簡單版本中不可用',
    note: '請確保 TypeScript 編譯成功以使用完整功能'
  });
});

app.post(`${apiPrefix}/auth/login`, (req, res) => {
  res.json({
    success: true,
    message: '登入功能在簡單版本中不可用',
    token: 'simulated-jwt-token',
    user: {
      id: 1,
      username: 'admin',
      role: 'admin'
    },
    note: '請確保 TypeScript 編譯成功以使用完整功能'
  });
});

// ==================== 自動備份排程系統 ====================
// 任務13：創建自動備份排程系統

// 備份排程設定（內存存儲，簡單版本）
const backupSchedules = [];

// 1. 獲取備份排程列表
app.get(`${apiPrefix}/backup/schedules`, (req, res) => {
  res.json({
    success: true,
    schedules: backupSchedules,
    count: backupSchedules.length,
    note: '這是簡單版本，完整功能請確保 TypeScript 編譯成功'
  });
});

// 2. 創建備份排程
app.post(`${apiPrefix}/backup/schedules`, (req, res) => {
  const { name, frequency, time, enabled } = req.body;
  
  if (!name || !frequency) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: '缺少必要參數：name 和 frequency'
    });
  }
  
  const newSchedule = {
    id: `schedule_${Date.now()}`,
    name,
    frequency, // daily, weekly, monthly
    time: time || '02:00',
    enabled: enabled !== false,
    created_at: new Date().toISOString(),
    last_run: null,
    next_run: calculateNextRun(frequency, time),
    note: '這是簡單版本，實際執行需要資料庫存儲'
  };
  
  backupSchedules.push(newSchedule);
  
  res.json({
    success: true,
    schedule: newSchedule,
    message: '備份排程創建成功'
  });
});

// 3. 更新備份排程
app.put(`${apiPrefix}/backup/schedules/:id`, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const scheduleIndex = backupSchedules.findIndex(s => s.id === id);
  
  if (scheduleIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `找不到 ID 為 ${id} 的備份排程`
    });
  }
  
  // 更新排程
  backupSchedules[scheduleIndex] = {
    ...backupSchedules[scheduleIndex],
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  // 重新計算下次執行時間
  if (updates.frequency || updates.time) {
    backupSchedules[scheduleIndex].next_run = calculateNextRun(
      updates.frequency || backupSchedules[scheduleIndex].frequency,
      updates.time || backupSchedules[scheduleIndex].time
    );
  }
  
  res.json({
    success: true,
    schedule: backupSchedules[scheduleIndex],
    message: '備份排程更新成功'
  });
});

// 4. 刪除備份排程
app.delete(`${apiPrefix}/backup/schedules/:id`, (req, res) => {
  const { id } = req.params;
  
  const scheduleIndex = backupSchedules.findIndex(s => s.id === id);
  
  if (scheduleIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `找不到 ID 為 ${id} 的備份排程`
    });
  }
  
  const deletedSchedule = backupSchedules.splice(scheduleIndex, 1)[0];
  
  res.json({
    success: true,
    schedule: deletedSchedule,
    message: '備份排程刪除成功'
  });
});

// 5. 手動觸發備份執行
app.post(`${apiPrefix}/backup/execute`, (req, res) => {
  const { schedule_id, manual } = req.body;
  
  console.log(`📦 執行備份：schedule_id=${schedule_id || 'manual'}, manual=${manual || false}`);
  
  // 模擬備份執行
  const backupResult = {
    id: `backup_${Date.now()}`,
    schedule_id: schedule_id || null,
    manual: manual || false,
    status: 'completed',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    size: Math.floor(Math.random() * 1000000) + 100000, // 模擬大小
    note: '這是簡單版本，實際備份需要連接資料庫'
  };
  
  // 更新排程的最後執行時間
  if (schedule_id) {
    const schedule = backupSchedules.find(s => s.id === schedule_id);
    if (schedule) {
      schedule.last_run = new Date().toISOString();
      schedule.next_run = calculateNextRun(schedule.frequency, schedule.time);
    }
  }
  
  res.json({
    success: true,
    backup: backupResult,
    message: '備份執行成功'
  });
});

// 6. 獲取備份執行歷史
app.get(`${apiPrefix}/backup/history`, (req, res) => {
  const { limit = 10 } = req.query;
  
  // 模擬歷史記錄
  const history = Array.from({ length: 5 }, (_, i) => ({
    id: `backup_${Date.now() - i * 86400000}`,
    schedule_id: i % 2 === 0 ? `schedule_${i}` : null,
    manual: i % 2 !== 0,
    status: 'completed',
    started_at: new Date(Date.now() - i * 86400000).toISOString(),
    completed_at: new Date(Date.now() - i * 86400000 + 5000).toISOString(),
    size: Math.floor(Math.random() * 1000000) + 100000
  }));
  
  res.json({
    success: true,
    history: history.slice(0, parseInt(limit)),
    total: history.length,
    note: '這是簡單版本，實際歷史需要資料庫存儲'
  });
});

// 計算下次執行時間的輔助函數
function calculateNextRun(frequency, time) {
  const now = new Date();
  const nextRun = new Date(now);
  
  // 解析時間（格式：HH:MM）
  const [hours, minutes] = (time || '02:00').split(':').map(Number);
  
  switch (frequency) {
    case 'daily':
      // 每天固定時間
      nextRun.setDate(now.getDate() + 1);
      nextRun.setHours(hours, minutes, 0, 0);
      break;
      
    case 'weekly':
      // 每週同一天
      nextRun.setDate(now.getDate() + 7);
      nextRun.setHours(hours, minutes, 0, 0);
      break;
      
    case 'monthly':
      // 每月同一天
      nextRun.setMonth(now.getMonth() + 1);
      nextRun.setHours(hours, minutes, 0, 0);
      break;
      
    default:
      // 默認每天
      nextRun.setDate(now.getDate() + 1);
      nextRun.setHours(hours, minutes, 0, 0);
  }
  
  return nextRun.toISOString();
}

// 定時檢查並執行備份排程（簡單版本，每分鐘檢查一次）
setInterval(() => {
  const now = new Date();
  
  backupSchedules.forEach(schedule => {
    if (!schedule.enabled) return;
    
    const nextRun = new Date(schedule.next_run);
    
    if (now >= nextRun) {
      console.log(`⏰ 觸發自動備份排程：${schedule.name} (${schedule.id})`);
      
      // 這裡可以實際調用備份執行邏輯
      // 為了簡單起見，我們只記錄日誌
      schedule.last_run = now.toISOString();
      schedule.next_run = calculateNextRun(schedule.frequency, schedule.time);
      
      console.log(`✅ 排程更新：下次執行時間 ${schedule.next_run}`);
    }
  });
}, 60000); // 每分鐘檢查一次

console.log('⏰ 自動備份排程系統已啟動（每分鐘檢查一次）');

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `端點 ${req.method} ${req.path} 不存在`,
    note: '這是簡單版本，完整 API 請確保 TypeScript 編譯成功'
  });
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('伺服器錯誤:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: '伺服器內部錯誤',
    note: '這是簡單版本，完整錯誤處理請確保 TypeScript 編譯成功'
  });
});

// 啟動伺服器
const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`🚀 台灣房東系統 API (簡單版本) 啟動成功！`);
  console.log(`🌐 監聽: ${host}:${port}`);
  console.log(`✅ 健康檢查: http://${host}:${port}/health`);
  console.log(`📚 API 文檔: http://${host}:${port}/api-docs`);
  console.log(`\n📝 重要提示:`);
  console.log(`   這是簡單版本，僅提供基本功能。`);
  console.log(`   完整功能需要 TypeScript 編譯成功。`);
  console.log(`   請檢查構建日誌確保 npm run build 成功執行。`);
});