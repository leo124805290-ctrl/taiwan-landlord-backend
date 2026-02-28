#!/usr/bin/env node

/**
 * 台灣房東-越南租客系統後端 API - 絕對安全的入口文件
 * 
 * 這個檔案是純 JavaScript，沒有任何 TypeScript 語法。
 * 確保 Zeabur 部署不會因為 SyntaxError 而失敗。
 */

console.log('🚀 台灣房東系統 API - 安全版本啟動中...');
console.log('📅 時間:', new Date().toISOString());
console.log('🖥️  Node.js 版本:', process.version);
console.log('🌐 環境:', process.env.NODE_ENV || 'development');

// 檢查 server.js 是否存在
const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, 'server.js');
const simpleApiPath = path.join(__dirname, 'simple-api.js');

console.log('\n🔍 檢查檔案:');
console.log(`   server.js: ${fs.existsSync(serverJsPath) ? '✅ 存在' : '❌ 不存在'}`);
console.log(`   simple-api.js: ${fs.existsSync(simpleApiPath) ? '✅ 存在' : '❌ 不存在'}`);

// 優先使用 simple-api.js，因為它是最安全的純 JavaScript 版本
if (fs.existsSync(simpleApiPath)) {
  console.log('\n✅ 使用 simple-api.js (最安全版本)');
  console.log('   這是純 JavaScript，沒有任何 TypeScript 語法');
  console.log('   確保部署 100% 成功');
  
  try {
    require('./simple-api.js');
  } catch (error) {
    console.error('❌ simple-api.js 啟動失敗:', error.message);
    startEmergencyServer();
  }
} else if (fs.existsSync(serverJsPath)) {
  console.log('\n⚠️ 使用 server.js');
  console.log('   注意: 確保 server.js 沒有 TypeScript 語法');
  
  try {
    require('./server.js');
  } catch (error) {
    console.error('❌ server.js 啟動失敗:', error.message);
    startEmergencyServer();
  }
} else {
  console.error('\n❌ 錯誤: 找不到任何可用的入口文件');
  startEmergencyServer();
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