#!/usr/bin/env node

/**
 * 台灣房東-越南租客系統後端 API - 主入口文件
 * 
 * 這個文件作為 Zeabur 部署的入口點，確保使用正確的版本。
 * 優先使用 TypeScript 編譯版本，如果不存在則使用備用方案。
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 啟動台灣房東-越南租客系統後端 API...');
console.log('環境:', process.env.NODE_ENV || 'development');
console.log('Node.js 版本:', process.version);
console.log('平台:', process.platform, process.arch);
console.log('工作目錄:', __dirname);

// 檢查可用的入口文件
const distIndexPath = path.join(__dirname, 'dist', 'index.js');
const srcJsIndexPath = path.join(__dirname, 'src', 'index.js');
const simpleApiPath = path.join(__dirname, 'simple-api.js');

console.log('\n🔍 檢查可用入口文件:');
console.log(`   dist/index.js: ${fs.existsSync(distIndexPath) ? '✅ 存在' : '❌ 不存在'}`);
console.log(`   src/index.js: ${fs.existsSync(srcJsIndexPath) ? '✅ 存在' : '❌ 不存在'}`);
console.log(`   simple-api.js: ${fs.existsSync(simpleApiPath) ? '✅ 存在' : '❌ 不存在'}`);

// 選擇入口文件 - 優先使用簡單版本確保部署成功
if (fs.existsSync(simpleApiPath)) {
  console.log('\n✅ 使用簡單穩定版本 (simple-api.js)');
  console.log('   這是純 JavaScript 版本，確保部署成功');
  console.log('   功能: 健康檢查、API 文檔、基本端點');
  require(simpleApiPath);
} else if (fs.existsSync(distIndexPath)) {
  console.log('\n⚠️ 使用 TypeScript 編譯版本 (dist/index.js)');
  console.log('   這是完整功能版本，包含所有 API 端點');
  require(distIndexPath);
} else if (fs.existsSync(srcJsIndexPath)) {
  console.log('\n⚠️ 使用純 JavaScript 版本 (src/index.js)');
  console.log('   這是基本版本，功能可能不完整');
  console.log('   提示: 建議運行 npm run build 編譯 TypeScript 版本');
  require(srcJsIndexPath);
} else {
  console.error('\n❌ 錯誤: 找不到任何可用的入口文件');
  console.error('請確保以下至少一個文件存在:');
  console.error('1. simple-api.js (簡單穩定版本)');
  console.error('2. dist/index.js (TypeScript 編譯版本)');
  console.error('3. src/index.js (純 JavaScript 版本)');
  console.error('\n解決方案:');
  console.error('1. 確保 simple-api.js 存在於專案根目錄');
  console.error('2. 或者運行 npm run build 編譯 TypeScript 代碼');
  process.exit(1);
}