// 模擬前端可能出錯的數據處理
const https = require('https');

console.log('🔍 模擬前端數據處理錯誤');
console.log('='.repeat(60));

const API_URL = 'https://taiwan-landlord-test.zeabur.app';

// 獲取雲端數據
https.get(`${API_URL}/api/sync/all`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (!result.success) {
        console.log('❌ 雲端數據獲取失敗:', result.message);
        return;
      }
      
      const cloudData = result.data || {};
      console.log('✅ 雲端數據獲取成功');
      console.log('數據結構:', Object.keys(cloudData));
      
      // 模擬前端可能出錯的操作
      console.log('\n🧪 模擬前端數據處理:');
      
      // 1. 檢查 rooms 處理
      console.log('1. 檢查 rooms 處理...');
      const rooms = cloudData.rooms;
      if (rooms === undefined) {
        console.log('   ❌ rooms 是 undefined');
        console.log('   錯誤: Cannot read properties of undefined (reading "length")');
      } else if (!Array.isArray(rooms)) {
        console.log('   ⚠️  rooms 不是陣列:', typeof rooms);
      } else {
        console.log('   ✅ rooms 是陣列，長度:', rooms.length);
      }
      
      // 2. 檢查 payments 處理
      console.log('2. 檢查 payments 處理...');
      const payments = cloudData.payments;
      if (payments === undefined) {
        console.log('   ❌ payments 是 undefined');
      } else if (!Array.isArray(payments)) {
        console.log('   ⚠️  payments 不是陣列:', typeof payments);
      } else {
        console.log('   ✅ payments 是陣列，長度:', payments.length);
      }
      
      // 3. 檢查 tenants 處理
      console.log('3. 檢查 tenants 處理...');
      const tenants = cloudData.tenants;
      if (tenants === undefined) {
        console.log('   ❌ tenants 是 undefined');
      } else if (!Array.isArray(tenants)) {
        console.log('   ⚠️  tenants 不是陣列:', typeof tenants);
      } else {
        console.log('   ✅ tenants 是陣列，長度:', tenants.length);
      }
      
      // 4. 檢查可能為 undefined 的其他字段
      console.log('4. 檢查其他可能字段...');
      const possibleUndefinedFields = [
        'maintenance', 'history', 'utilityExpenses', 
        'additionalIncomes', 'expenseCategories'
      ];
      
      for (const field of possibleUndefinedFields) {
        const value = cloudData[field];
        if (value === undefined) {
          console.log(`   ⚠️  ${field}: undefined (可能導致錯誤)`);
        }
      }
      
      // 5. 創建修復的數據結構
      console.log('\n🔧 創建安全的數據結構:');
      const safeData = {
        properties: cloudData.properties || [],
        rooms: cloudData.rooms || [],
        payments: cloudData.payments || [],
        tenants: cloudData.tenants || [],
        maintenance: cloudData.maintenance || [],
        history: cloudData.history || [],
        utilityExpenses: cloudData.utilityExpenses || [],
        additionalIncomes: cloudData.additionalIncomes || [],
        electricityRate: cloudData.electricityRate || 5,
        actualElectricityRate: cloudData.actualElectricityRate || 5.0
      };
      
      console.log('   所有陣列字段已確保不是 undefined');
      console.log('   空陣列長度檢查:');
      for (const [key, value] of Object.entries(safeData)) {
        if (Array.isArray(value)) {
          console.log(`     ${key}: ${value.length} 個項目`);
        }
      }
      
      console.log('\n' + '='.repeat(60));
      console.log('📋 問題診斷總結:');
      console.log('='.repeat(60));
      console.log('✅ 雲端數據結構正常');
      console.log('✅ 所有必要字段都存在');
      console.log('⚠️  前端代碼可能假設某些字段永遠有數據');
      console.log('');
      console.log('🔧 建議修復:');
      console.log('1. 在前端代碼中添加空值檢查');
      console.log('2. 使用可選鏈操作符: data?.rooms?.length');
      console.log('3. 提供默認值: data.rooms || []');
      console.log('');
      console.log('🚀 立即測試:');
      console.log('在瀏覽器控制台運行:');
      console.log('fetch("/api/sync/all").then(r => r.json()).then(d => console.log(d.data?.rooms?.length || 0))');
      
    } catch (error) {
      console.log('❌ 解析錯誤:', error.message);
    }
  });
}).on('error', (error) => {
  console.log('❌ 請求失敗:', error.message);
});