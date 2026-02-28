#!/usr/bin/env node

/**
 * 台灣房東-越南租客系統後端 API - 主入口文件
 * 
 * 這個文件作為 Zeabur 部署的入口點，確保使用正確的版本。
 * 優先使用 TypeScript 編譯版本，如果不存在則使用純 JavaScript 版本。
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 啟動台灣房東-越南租客系統後端 API...');
console.log('環境:', process.env.NODE_ENV || 'development');
console.log('Node.js 版本:', process.version);
console.log('平台:', process.platform, process.arch);

// 檢查編譯後的 TypeScript 版本
const distIndexPath = path.join(__dirname, 'dist', 'index.js');
const srcJsIndexPath = path.join(__dirname, 'src', 'index.js');

if (fs.existsSync(distIndexPath)) {
  console.log('✅ 使用 TypeScript 編譯版本 (dist/index.js)');
  require(distIndexPath);
} else if (fs.existsSync(srcJsIndexPath)) {
  console.log('⚠️ 使用純 JavaScript 版本 (src/index.js)');
  console.log('提示: 建議運行 npm run build 編譯 TypeScript 版本');
  require(srcJsIndexPath);
} else {
  console.error('❌ 錯誤: 找不到可用的入口文件');
  console.error('請確保:');
  console.error('1. 運行 npm run build 編譯 TypeScript 代碼');
  console.error('2. 或者確保 src/index.js 存在');
  process.exit(1);
}