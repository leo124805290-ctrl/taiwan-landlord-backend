// 簡單的 JavaScript 版本 API（備用方案）
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
    service: '台灣房東-越南租客系統 API (JS 版本)',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API 文檔端點
app.get('/api-docs', (req, res) => {
  res.json({
    name: '台灣房東-越南租客系統 API',
    version: '1.0.0',
    endpoints: {
      auth: `${apiPrefix}/auth`,
      health: '/health',
      docs: '/api-docs',
    },
    authentication: 'Bearer Token (開發中)',
    note: '這是簡化版本，完整功能請使用 TypeScript 版本',
  });
});

// 簡單的認證測試端點
app.post(`${apiPrefix}/auth/login`, (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: '缺少參數',
      message: '請提供用戶名和密碼',
    });
  }
  
  // 簡單的測試認證
  if (username === 'admin' && password === 'Admin123!') {
    res.json({
      success: true,
      data: {
        user: {
          id: 1,
          username: 'admin',
          role: 'admin',
        },
        token: 'test-jwt-token-for-development',
      },
      message: '登入成功（測試模式）',
    });
  } else {
    res.status(401).json({
      success: false,
      error: '認證失敗',
      message: '用戶名或密碼錯誤',
    });
  }
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `找不到路徑: ${req.path}`,
  });
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('伺服器錯誤:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: '伺服器內部錯誤',
  });
});

// 啟動伺服器
app.listen(port, () => {
  console.log(`🚀 伺服器運行在 http://localhost:${port}`);
  console.log(`✅ 健康檢查: http://localhost:${port}/health`);
  console.log(`📚 API 文檔: http://localhost:${port}/api-docs`);
  console.log(`🔑 測試登入: POST http://localhost:${port}${apiPrefix}/auth/login`);
  console.log(`📝 測試數據: {"username":"admin","password":"Admin123!"}`);
});