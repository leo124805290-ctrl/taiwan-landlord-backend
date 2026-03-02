// 監控 expenseCategories 修復部署
const https = require('https');

const API_URL = 'https://taiwan-landlord-test.zeabur.app';

console.log('🚀 監控 expenseCategories 修復部署');
console.log('時間:', new Date().toISOString());
console.log('='.repeat(60));

let checkCount = 0;
const MAX_CHECKS = 20; // 10分鐘
const CHECK_INTERVAL = 30000; // 30秒

function checkDeployment() {
  checkCount++;
  
  if (checkCount > MAX_CHECKS) {
    console.log('\n❌ 部署監控超時 (10分鐘)');
    console.log('請檢查 Zeabur 控制台部署狀態');
    process.exit(1);
  }
  
  const elapsedMinutes = Math.floor(checkCount * 30 / 60);
  const elapsedSeconds = (checkCount * 30) % 60;
  
  console.log(`\n檢查 ${checkCount}/${MAX_CHECKS} (${elapsedMinutes}分${elapsedSeconds}秒)`);
  
  https.get(`${API_URL}/api/sync/all`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        console.log(`  狀態: ${res.statusCode}`);
        console.log(`  成功: ${result.success}`);
        
        if (result.data && 'expenseCategories' in result.data) {
          const expenseCats = result.data.expenseCategories;
          console.log(`  expenseCategories: ✅ 已添加`);
          console.log(`    數量: ${Array.isArray(expenseCats) ? expenseCats.length : '不是陣列'}`);
          
          if (Array.isArray(expenseCats) && expenseCats.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log('🎉 修復部署成功！');
            console.log('='.repeat(60));
            console.log('✅ expenseCategories 字段已添加');
            console.log(`✅ 有 ${expenseCats.length} 個支出分類`);
            console.log('✅ 前端錯誤應該已解決');
            console.log('');
            console.log('🚀 現在可以:');
            console.log('1. 清除瀏覽器緩存');
            console.log('2. 重新加載前端網站');
            console.log('3. 測試所有功能');
            console.log('');
            console.log('📱 前端網址:');
            console.log('https://taiwan-landlord-vietnam-tenant-syst.vercel.app');
            
            // 測試其他字段
            console.log('\n🔍 其他數據字段檢查:');
            const fields = ['properties', 'rooms', 'payments', 'tenants', 'maintenance', 'history'];
            fields.forEach(field => {
              const value = result.data[field];
              console.log(`  ${field}: ${Array.isArray(value) ? value.length + ' 個項目' : '❌ 不是陣列'}`);
            });
            
            process.exit(0);
          }
        } else {
          console.log(`  expenseCategories: ❌ 仍然缺失`);
          console.log(`  數據字段: ${Object.keys(result.data || {}).join(', ')}`);
        }
        
      } catch (error) {
        console.log('  解析錯誤，服務可能正在部署...');
      }
      
      // 繼續檢查
      setTimeout(checkDeployment, CHECK_INTERVAL);
    });
  }).on('error', (error) => {
    console.log('  服務暫時不可用，可能正在部署...');
    setTimeout(checkDeployment, CHECK_INTERVAL);
  });
}

// 開始監控
checkDeployment();

console.log('\n📅 預計時間線:');
console.log('  現在: 部署開始');
console.log('  2-5分鐘: 新版本上線');
console.log('  5-8分鐘: 修復生效');
console.log('\n🔧 修復內容:');
console.log('  在 /api/sync/all 中添加 expenseCategories 字段');
console.log('  解決前端錯誤: Cannot read properties of undefined (reading "length")');