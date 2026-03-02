#!/usr/bin/env node

/**
 * 台灣房東-越南租客系統後端 API - 修正版入口文件
 * 
 * 優先使用編譯後的 dist/index.js
 */

console.log('🚀 台灣房東系統 API - 修正版啟動中...');
console.log('📅 時間:', new Date().toISOString());
console.log('🖥️  Node.js 版本:', process.version);
console.log('🌐 環境:', process.env.NODE_ENV || 'development');

// 檢查 dist/index.js 是否存在
const fs = require('fs');
const path = require('path');

const distIndexPath = path.join(__dirname, 'dist/index.js');
const simpleApiPath = path.join(__dirname, 'simple-api.js');

console.log('\n🔍 檢查檔案:');
console.log(`   dist/index.js: ${fs.existsSync(distIndexPath) ? '✅ 存在' : '❌ 不存在'}`);
console.log(`   simple-api.js: ${fs.existsSync(simpleApiPath) ? '✅ 存在' : '❌ 不存在'}`);

// 優先使用 dist/index.js，因為它包含最新的 sync/all 實現
if (fs.existsSync(distIndexPath)) {
  console.log('\n✅ 使用 dist/index.js (最新編譯版本)');
  console.log('   包含最新的 sync/all 巢狀結構實現');
  console.log('   符合前端資料結構要求');
  
  try {
    require('./dist/index.js');
  } catch (error) {
    console.error('❌ dist/index.js 啟動失敗:', error.message);
    console.error('   錯誤堆棧:', error.stack);
    fallbackToSimpleApi();
  }
} else {
  console.log('\n⚠️ dist/index.js 不存在，使用 simple-api.js');
  fallbackToSimpleApi();
}

function fallbackToSimpleApi() {
  if (fs.existsSync(simpleApiPath)) {
    console.log('\n⚠️ 使用 simple-api.js (備用版本)');
    console.log('   注意: sync/all 可能不是巢狀結構');
    
    try {
      require('./simple-api.js');
    } catch (error) {
      console.error('❌ simple-api.js 啟動失敗:', error.message);
      startEmergencyServer();
    }
  } else {
    console.error('\n❌ 錯誤: 找不到任何可用的入口文件');
    startEmergencyServer();
  }
}

// 緊急備用伺服器 - 絕對不會失敗
function startEmergencyServer() {
  console.log('\n🚨 啟動緊急備用伺服器...');
  console.log('   這是絕對安全的純 JavaScript 伺服器');
  
  const http = require('http');
  const port = process.env.PORT || 3001;
  const host = '0.0.0.0';
  
  const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    
    // 健康檢查端點
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        service: '台灣房東系統 API (緊急備用)',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        note: '這是緊急備用伺服器，主要入口文件有問題'
      }));
      return;
    }
    
    // API 文檔
    if (req.url === '/api-docs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: '台灣房東系統 API (緊急備用)',
        endpoints: {
          health: 'GET /health',
          api_docs: 'GET /api-docs'
        },
        note: '請檢查主要入口文件是否有 TypeScript 語法錯誤'
      }));
      return;
    }
    
    // 其他請求
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Not Found',
      message: '端點不存在',
      note: '這是緊急備用伺服器，功能有限'
    }));
  });
  
  server.listen(port, host, () => {
    console.log(`✅ 緊急備用伺服器啟動成功！`);
    console.log(`🌐 監聽: ${host}:${port}`);
    console.log(`✅ 健康檢查: http://${host}:${port}/health`);
    console.log(`📚 API 文檔: http://${host}:${port}/api-docs`);
    console.log('\n⚠️ 重要提示:');
    console.log('   主要入口文件可能有 TypeScript 語法錯誤');
    console.log('   請檢查 app.js、server.js 等檔案');
    console.log('   確保沒有 :number、:string 等 TypeScript 語法');
  });
  
  // 優雅關閉
  process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信號，關閉伺服器...');
    server.close(() => {
      console.log('伺服器已關閉');
      process.exit(0);
    });
  });
}
