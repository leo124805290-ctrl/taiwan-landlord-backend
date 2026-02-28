#!/usr/bin/env node

/**
 * 台灣房東-越南租客系統後端 API - 主入口文件
 * 
 * Zeabur 可能默認運行 app.js，所以我們創建這個文件作為入口點。
 * 這個文件會重定向到正確的 server.js 文件。
 */

console.log('🚀 台灣房東-越南租客系統後端 API 啟動中...');
console.log('📝 這個文件是入口點，將重定向到 server.js');

// 重定向到 server.js
require('./server.js');