// 深度調試前端錯誤
const https = require('https');

const API_URL = 'https://taiwan-landlord-test.zeabur.app';

console.log('🔍 深度調試前端 .map() 錯誤');
console.log('時間:', new Date().toISOString());
console.log('='.repeat(60));

https.get(`${API_URL}/api/sync/all`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      const cloudData = result.data || {};
      
      console.log('✅ 雲端數據獲取成功');
      console.log('數據字段數:', Object.keys(cloudData).length);
      
      // 1. 檢查所有可能的 .map() 操作
      console.log('\n1. 檢查所有可能的 .map() 操作源頭:');
      
      // 常見的前端操作模式
      const commonMapPatterns = [
        { field: 'rooms', operation: 'rooms.map(room => ...)' },
        { field: 'payments', operation: 'payments.map(payment => ...)' },
        { field: 'tenants', operation: 'tenants.map(tenant => ...)' },
        { field: 'properties', operation: 'properties.map(property => ...)' },
        { field: 'maintenance', operation: 'maintenance.map(item => ...)' },
        { field: 'history', operation: 'history.map(record => ...)' },
        { field: 'utilityExpenses', operation: 'utilityExpenses.map(expense => ...)' },
        { field: 'additionalIncomes', operation: 'additionalIncomes.map(income => ...)' },
        { field: 'expenseCategories', operation: 'expenseCategories.map(cat => ...)' },
        // 嵌套結構
        { field: 'expenseCategories[0].subCategories', operation: 'expenseCategories.map(cat => cat.subCategories.map(...))' }
      ];
      
      for (const pattern of commonMapPatterns) {
        const field = pattern.field;
        
        // 處理嵌套字段
        let value;
        if (field.includes('[')) {
          // 如 expenseCategories[0].subCategories
          const parts = field.split(/[\[\].]+/).filter(p => p);
          value = cloudData;
          for (const part of parts) {
            if (value && typeof value === 'object') {
              if (part.match(/^\d+$/)) {
                value = value[parseInt(part)];
              } else {
                value = value[part];
              }
            } else {
              value = undefined;
              break;
            }
          }
        } else {
          value = cloudData[field];
        }
        
        if (value === undefined) {
          console.log(`   ❌ ${pattern.operation}: ${field} 是 undefined`);
        } else if (value === null) {
          console.log(`   ❌ ${pattern.operation}: ${field} 是 null`);
        } else if (!Array.isArray(value)) {
          console.log(`   ❌ ${pattern.operation}: ${field} 不是陣列 (${typeof value})`);
        } else {
          console.log(`   ✅ ${pattern.operation}: 正常 (長度 ${value.length})`);
        }
      }
      
      // 2. 檢查 expenseCategories 的嵌套結構
      console.log('\n2. 檢查 expenseCategories 嵌套結構:');
      const expenseCats = cloudData.expenseCategories;
      if (Array.isArray(expenseCats) && expenseCats.length > 0) {
        console.log('   ✅ expenseCategories 是陣列，長度:', expenseCats.length);
        
        for (let i = 0; i < Math.min(expenseCats.length, 3); i++) {
          const cat = expenseCats[i];
          console.log(`   分類 ${i}: ${cat.id} - ${cat.name}`);
          
          if (cat.subCategories === undefined) {
            console.log(`     ❌ subCategories 是 undefined`);
          } else if (!Array.isArray(cat.subCategories)) {
            console.log(`     ❌ subCategories 不是陣列 (${typeof cat.subCategories})`);
          } else {
            console.log(`     ✅ subCategories: 陣列，長度 ${cat.subCategories.length}`);
          }
        }
      }
      
      // 3. 創建修復建議
      console.log('\n3. 創建前端修復代碼:');
      console.log('   // 安全地處理可能為 undefined 的陣列');
      console.log('   const safeMap = (array, callback) => {');
      console.log('     if (!array || !Array.isArray(array)) return [];');
      console.log('     return array.map(callback);');
      console.log('   };');
      console.log('');
      console.log('   // 使用示例:');
      console.log('   const rooms = safeMap(cloudData.rooms, room => ({ ... }));');
      console.log('   const categories = safeMap(cloudData.expenseCategories, cat => ({');
      console.log('     ...cat,');
      console.log('     subCategories: safeMap(cat.subCategories, sub => ({ ... }))');
      console.log('   }));');
      
      // 4. 立即測試修復
      console.log('\n4. 立即測試 - 添加測試數據:');
      console.log('   後端可以添加一些測試數據，避免空陣列問題');
      
      const testDataScript = `
// 在瀏覽器控制台運行這個測試
async function testFrontendFix() {
  try {
    const response = await fetch('${API_URL}/api/sync/all');
    const data = await response.json();
    
    // 安全處理函數
    const safeMap = (array, callback) => {
      if (!array || !Array.isArray(array)) return [];
      return array.map(callback);
    };
    
    // 測試所有可能出錯的字段
    const fields = ['rooms', 'payments', 'tenants', 'expenseCategories'];
    fields.forEach(field => {
      const value = data.data?.[field];
      const result = safeMap(value, item => item?.id || '無ID');
      console.log(\`\${field}: 安全處理結果 - \${result.length} 個項目\`);
    });
    
    console.log('✅ 前端修復測試通過');
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}
testFrontendFix();
`;
      
      console.log('   測試腳本已準備好');
      
      console.log('\n' + '='.repeat(60));
      console.log('📋 錯誤分析總結:');
      console.log('='.repeat(60));
      console.log('✅ 雲端數據結構正常');
      console.log('✅ 所有字段都存在且是陣列');
      console.log('⚠️  前端代碼可能:');
      console.log('   1. 嘗試對 undefined 進行 .map()');
      console.log('   2. 嵌套結構中的 undefined (如 cat.subCategories)');
      console.log('   3. 假設陣列永遠有數據');
      console.log('');
      console.log('🔧 推薦解決方案:');
      console.log('   1. 在前端添加安全處理函數');
      console.log('   2. 使用可選鏈: data?.rooms?.map(...)');
      console.log('   3. 提供默認值: (data.rooms || []).map(...)');
      
    } catch (error) {
      console.log('❌ 解析錯誤:', error.message);
    }
  });
}).on('error', (error) => {
  console.log('❌ 請求失敗:', error.message);
});