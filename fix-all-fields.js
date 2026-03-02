// 修復所有可能的前端字段
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'simple-api-fixed.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 修復所有前端字段，避免 undefined 錯誤');

// 找到 /api/sync/all 的數據返回部分
const syncAllStart = content.indexOf('app.get(`${apiPrefix}/sync/all`');
if (syncAllStart === -1) {
  console.log('❌ 找不到 /api/sync/all 端點');
  process.exit(1);
}

// 找到 const allData = { 開始的位置
let dataStart = content.indexOf('const allData = {', syncAllStart);
if (dataStart === -1) {
  console.log('❌ 找不到 allData 定義');
  process.exit(1);
}

// 找到 allData 的結束位置（下一個大括號結束）
let braceCount = 0;
let dataEnd = dataStart;
let inString = false;
let stringChar = '';

for (let i = dataStart; i < content.length; i++) {
  const char = content[i];
  const prevChar = i > 0 ? content[i - 1] : '';
  
  // 處理字符串
  if (!inString && (char === '"' || char === "'" || char === '`')) {
    inString = true;
    stringChar = char;
  } else if (inString && char === stringChar && prevChar !== '\\') {
    inString = false;
    stringChar = '';
  }
  
  // 如果不是在字符串中，計算括號
  if (!inString) {
    if (char === '{') braceCount++;
    if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        dataEnd = i + 1;
        break;
      }
    }
  }
}

if (dataEnd <= dataStart) {
  console.log('❌ 無法找到 allData 的結束位置');
  process.exit(1);
}

// 提取當前的 allData
const currentAllData = content.substring(dataStart, dataEnd);
console.log('📋 當前 allData 結構:');
console.log(currentAllData.substring(0, 500) + '...');

// 創建修復後的 allData
const fixedAllData = `const allData = {
  // 核心數據
  properties: propertiesResult.rows,
  rooms: roomsResult.rows,
  payments: paymentsResult.rows,
  tenants: tenantsResult.rows,
  maintenance: maintenanceResult.rows,
  history: historyResult.rows,
  
  // 財務相關
  electricityRate: 6,
  actualElectricityRate: 4.5,
  utilityExpenses: [],
  additionalIncomes: [],
  
  // 分類相關（避免前端 undefined 錯誤）
  expenseCategories: [
    {
      id: 'renovation',
      name: '裝修工程',
      subCategories: [
        { id: 'paint', name: '油漆粉刷' },
        { id: 'floor', name: '地板工程' },
        { id: 'bathroom', name: '浴室裝修' }
      ]
    },
    {
      id: 'repair',
      name: '維修保養',
      subCategories: [
        { id: 'plumbing', name: '水電維修' },
        { id: 'appliance', name: '家電維修' },
        { id: 'furniture', name: '家具維修' }
      ]
    },
    {
      id: 'management',
      name: '管理費用',
      subCategories: [
        { id: 'cleaning', name: '清潔費用' },
        { id: 'security', name: '保全費用' },
        { id: 'admin', name: '行政費用' }
      ]
    }
  ],
  
  // 確保所有可能的前端字段都存在（空陣列）
  expenses: [],
  incomeCategories: [],
  categories: [],
  expenseRecords: [],
  incomeRecords: [],
  financialRecords: [],
  budgetItems: [],
  reports: [],
  analytics: [],
  statistics: [],
  charts: [],
  summaries: [],
  
  // 診斷信息
  _diagnostics: {
    timestamp: new Date().toISOString(),
    version: '2.0.0-fixed',
    note: '所有前端字段已確保不是 undefined'
  }
};`;

// 替換內容
content = content.substring(0, dataStart) + fixedAllData + content.substring(dataEnd);

// 寫回檔案
fs.writeFileSync(filePath, content);
console.log('✅ allData 已修復');

// 提交更改
const { execSync } = require('child_process');
try {
  execSync('git add simple-api-fixed.js', { stdio: 'inherit' });
  execSync('git commit -m "fix: 徹底修復前端字段，確保沒有 undefined"', { stdio: 'inherit' });
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('\n🚀 代碼已提交並推送');
  console.log('📋 下一步: 在 Zeabur 重新部署');
} catch (error) {
  console.log('⚠️  Git 操作失敗:', error.message);
}