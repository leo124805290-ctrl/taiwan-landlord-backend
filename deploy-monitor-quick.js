// 快速部署監控
const https = require('https');

const API_URL = 'https://taiwan-landlord-test.zeabur.app';
let checkCount = 0;
const maxChecks = 60; // 最多檢查60次
const checkInterval = 10000; // 每10秒檢查一次

console.log('🚀 開始監控 Zeabur 部署進度');
console.log('時間:', new Date().toISOString());
console.log('API:', API_URL);
console.log('='.repeat(60));
console.log('預計等待時間: 5-10分鐘');
console.log('檢查間隔: 10秒');
console.log('');

function checkDeployment() {
  checkCount++;
  
  if (checkCount > maxChecks) {
    console.log('❌ 監控超時 (10分鐘)');
    console.log('請檢查 Zeabur 控制台的部署狀態');
    process.exit(1);
  }
  
  console.log(`檢查 ${checkCount}/${maxChecks} - ${new Date().toLocaleTimeString()}`);
  
  https.get(`${API_URL}/health`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        console.log(`  狀態: ${res.statusCode}`);
        console.log(`  服務: ${result.service}`);
        console.log(`  版本: ${result.version}`);
        
        if (result.service.includes('PostgreSQL')) {
          console.log('\n' + '='.repeat(60));
          console.log('🎉 新版本部署成功！');
          console.log('='.repeat(60));
          console.log(`服務: ${result.service}`);
          console.log(`版本: ${result.version}`);
          console.log(`環境: ${result.environment}`);
          console.log(`資料庫: ${result.database?.type || 'PostgreSQL'}`);
          console.log(`連接: ${result.database?.connected ? '✅ 已連接' : '❌ 未連接'}`);
          console.log('');
          
          // 運行完整測試
          console.log('🧪 開始運行完整測試...');
          require('./test-sync-fixed.js');
          
          process.exit(0);
        } else {
          console.log('  ⏳ 還是舊版本，等待部署完成...');
          console.log(`  已等待: ${Math.round(checkCount * 10 / 60)}分鐘`);
          console.log('');
          
          // 繼續檢查
          setTimeout(checkDeployment, checkInterval);
        }
      } catch (error) {
        console.log('  解析錯誤，服務可能正在重啟...');
        console.log('');
        setTimeout(checkDeployment, checkInterval);
      }
    });
  }).on('error', (error) => {
    console.log('  請求失敗，服務可能正在部署中...');
    console.log('');
    setTimeout(checkDeployment, checkInterval);
  });
}

// 開始監控
checkDeployment();