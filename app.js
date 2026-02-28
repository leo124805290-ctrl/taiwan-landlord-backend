#!/usr/bin/env node

/**
 * 台灣房東-越南租客系統後端 API - 主入口文件
 * 
 * Zeabur 可能默認運行 app.js，所以我們創建這個文件作為入口點。
 * 這個文件會重定向到正確的 server.js 文件。
 * 
 * 重要：這是純 JavaScript 檔案，不能包含 TypeScript 語法！
 */

console.log('🚀 台灣房東-越南租客系統後端 API 啟動中...');
console.log('📝 這個文件是入口點，將重定向到 server.js');
console.log('📋 檢查環境:');
console.log(`   Node.js 版本: ${process.version}`);
console.log(`   平台: ${process.platform} ${process.arch}`);
console.log(`   工作目錄: ${__dirname}`);
console.log(`   環境: ${process.env.NODE_ENV || 'development'}`);

// 檢查 server.js 是否存在
const fs = require('fs');
const path = require('path');
const serverJsPath = path.join(__dirname, 'server.js');

if (fs.existsSync(serverJsPath)) {
  console.log('\n✅ 找到 server.js，開始重定向...');
  console.log('   注意: 所有功能將由 server.js 提供');
  console.log('   簡單版本優先，確保部署成功');
  
  // 重定向到 server.js
  require('./server.js');
} else {
  console.error('\n❌ 錯誤: 找不到 server.js 文件');
  console.error('請確保 server.js 存在於專案根目錄');
  console.error('\n解決方案:');
  console.error('1. 檢查專案結構，確保 server.js 存在');
  console.error('2. 或者創建一個有效的入口文件');
  
  // 提供一個最簡單的 HTTP 伺服器作為最後的備用方案
  console.log('\n⚠️ 啟動最簡單的備用伺服器...');
  const http = require('http');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      service: '台灣房東系統 API (緊急備用)',
      message: 'server.js 不存在，這是緊急備用伺服器',
      health: 'ok',
      timestamp: new Date().toISOString()
    }));
  });
  
  const port = process.env.PORT || 3001;
  server.listen(port, '0.0.0.0', () => {
    console.log(`⚠️ 緊急備用伺服器啟動在端口 ${port}`);
    console.log(`⚠️ 這只有健康檢查功能，請修復 server.js`);
  });
}