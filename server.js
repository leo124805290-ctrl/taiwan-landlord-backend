#!/usr/bin/env node

/**
 * 台灣房東-越南租客系統後端 API - 主入口文件 (修復版)
 * 
 * 優先使用 PostgreSQL 修復版本，實現多設備數據同步。
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 台灣房東系統 API - PostgreSQL 版本啟動中...');
console.log('📅 時間:', new Date().toISOString());
console.log('🖥️ Node.js 版本:', process.version);
console.log('🌐 環境:', process.env.NODE_ENV || 'production');
console.log('工作目錄:', __dirname);

// 檢查可用的入口文件
const simpleApiFixedPath = path.join(__dirname, 'simple-api-fixed.js'); // PostgreSQL 版本 (推薦)
const simpleApiPath = path.join(__dirname, 'simple-api.js'); // 舊版本 (內存存儲)
const distIndexPath = path.join(__dirname, 'dist', 'index.js');
const srcJsIndexPath = path.join(__dirname, 'src', 'index.js');

console.log('\n🔍 檢查可用入口文件:');
console.log(`   simple-api-fixed.js (PostgreSQL): ${fs.existsSync(simpleApiFixedPath) ? '✅ 存在' : '❌ 不存在'}`);
console.log(`   simple-api.js (舊版本): ${fs.existsSync(simpleApiPath) ? '✅ 存在' : '❌ 不存在'}`);
console.log(`   dist/index.js: ${fs.existsSync(distIndexPath) ? '✅ 存在' : '❌ 不存在'}`);
console.log(`   src/index.js: ${fs.existsSync(srcJsIndexPath) ? '✅ 存在' : '❌ 不存在'}`);

// 選擇入口文件 - 優先使用 PostgreSQL 修復版本
if (fs.existsSync(simpleApiFixedPath)) {
  console.log('\n🎉 使用 simple-api-fixed.js (PostgreSQL 版本 2.0.0)');
  console.log('   ✅ 完整功能: 數據同步、持久化存儲');
  console.log('   ✅ 多設備支持: 所有設備看到相同數據');
  console.log('   ✅ 數據持久化: 服務器重啟不丟失數據');
  console.log('   ✅ PostgreSQL: 專業資料庫連接');
  console.log('   🚀 啟動 PostgreSQL 版本...');
  require('./simple-api-fixed.js');
} else if (fs.existsSync(simpleApiPath)) {
  console.log('\n⚠️  使用 simple-api.js (舊版本 1.0.0 - 內存存儲)');
  console.log('   ⚠️  注意: 數據存儲在內存中');
  console.log('   ⚠️  限制: 服務器重啟會丟失所有數據');
  console.log('   ⚠️  限制: 多設備無法同步數據');
  console.log('   🔧 建議: 部署 simple-api-fixed.js 獲得完整功能');
  require('./simple-api.js');
} else if (fs.existsSync(distIndexPath)) {
  console.log('\n✅ 使用 dist/index.js (TypeScript 編譯版本)');
  require('./dist/index.js');
} else if (fs.existsSync(srcJsIndexPath)) {
  console.log('\n✅ 使用 src/index.js (JavaScript 源碼版本)');
  require('./src/index.js');
} else {
  console.error('\n❌ 錯誤: 找不到任何可用的入口文件！');
  console.error('   請確保至少有以下文件之一:');
  console.error('   1. simple-api-fixed.js (推薦 - PostgreSQL 版本)');
  console.error('   2. simple-api.js (備用 - 內存存儲版本)');
  console.error('   3. dist/index.js (TypeScript 編譯版本)');
  console.error('   4. src/index.js (JavaScript 源碼版本)');
  console.error('\n📋 解決方案:');
  console.error('   1. 確保 simple-api-fixed.js 存在於專案根目錄');
  console.error('   2. 或者從 GitHub 下載最新版本');
  process.exit(1);
}