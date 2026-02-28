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