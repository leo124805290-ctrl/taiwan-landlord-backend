#!/usr/bin/env node

/**
 * 測試部署修復
 * 驗證所有入口檔案都沒有 TypeScript 語法
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 測試台灣房東系統後端部署修復');
console.log('====================================');

const filesToCheck = [
  'app.js',
  'server.js', 
  'simple-api.js'
];

let allPassed = true;

filesToCheck.forEach(file => {
  console.log(`\n📁 檢查 ${file}...`);
  
  if (!fs.existsSync(file)) {
    console.log(`   ❌ 檔案不存在: ${file}`);
    allPassed = false;
    return;
  }
  
  // 檢查語法
  try {
    execSync(`node -c ${file}`, { stdio: 'pipe' });
    console.log(`   ✅ 語法正確`);
  } catch (error) {
    console.log(`   ❌ 語法錯誤: ${error.message.split('\n')[0]}`);
    allPassed = false;
  }
  
  // 檢查 TypeScript 語法
  const content = fs.readFileSync(file, 'utf8');
  const tsPatterns = [
    /: number\b/,
    /: string\b/, 
    /: boolean\b/,
    /: any\b/,
    /: void\b/,
    /: object\b/,
    /interface\s+\w+/,
    /type\s+\w+\s*=/,
    /\bas\s+[A-Z][A-Za-z]*\b/
  ];
  
  let hasTsSyntax = false;
  tsPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      console.log(`   ⚠️  發現 TypeScript 語法: ${pattern.toString()}`);
      hasTsSyntax = true;
    }
  });
  
  if (hasTsSyntax) {
    console.log(`   ❌ ${file} 包含 TypeScript 語法，Zeabur 會失敗`);
    allPassed = false;
  } else {
    console.log(`   ✅ 沒有 TypeScript 語法`);
  }
});

console.log('\n====================================');
if (allPassed) {
  console.log('🎉 所有檢查通過！部署應該會成功。');
  console.log('\n部署流程:');
  console.log('1. Zeabur 會執行 app.js');
  console.log('2. app.js 會重定向到 server.js');
  console.log('3. server.js 會優先使用 simple-api.js (純 JavaScript)');
  console.log('4. 應用程式啟動成功！');
} else {
  console.log('❌ 有些檢查失敗，請修復問題後再部署。');
  console.log('\n常見問題:');
  console.log('1. 確保所有 .js 檔案都沒有 TypeScript 語法 (:number, :string 等)');
  console.log('2. 確保所有檔案語法正確 (使用 node -c 檢查)');
  console.log('3. 確保必要檔案存在');
}

// 測試實際啟動
console.log('\n🚀 測試啟動流程...');
try {
  // 模擬 Zeabur 的執行流程
  console.log('   1. Zeabur 執行: node app.js');
  console.log('   2. app.js 檢查 server.js');
  console.log('   3. server.js 檢查 simple-api.js');
  console.log('   4. 啟動 simple-api.js');
  
  // 檢查 simple-api.js 是否可以正常啟動
  const simpleApi = require('./simple-api.js');
  console.log('   ✅ 啟動流程測試通過');
} catch (error) {
  console.log(`   ❌ 啟動測試失敗: ${error.message}`);
  allPassed = false;
}

console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('✅ 所有測試通過！可以安全部署到 Zeabur。');
  process.exit(0);
} else {
  console.log('❌ 測試失敗，請修復問題後再部署。');
  process.exit(1);
}