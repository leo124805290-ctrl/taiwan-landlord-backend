// 檢查服務穩定性
const https = require('https');

const API_URL = 'https://taiwan-landlord-test.zeabur.app';

console.log('🔍 檢查服務穩定性');
console.log('時間:', new Date().toISOString());
console.log('='.repeat(60));

let lastUptime = 0;
let stableCount = 0;
const MAX_CHECKS = 12; // 6分鐘
const CHECK_INTERVAL = 30000; // 30秒

function checkService() {
  https.get(`${API_URL}/health`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        const uptime = Math.floor(result.uptime || 0);
        const serviceName = result.service || '';
        
        console.log(`檢查 ${stableCount + 1}/${MAX_CHECKS}:`);
        console.log(`  服務: ${serviceName}`);
        console.log(`  版本: ${result.version}`);
        console.log(`  運行時間: ${uptime} 秒 (${Math.floor(uptime/60)}分${uptime%60}秒)`);
        console.log(`  資料庫: ${result.database?.connected ? '✅ 已連接' : '❌ 未連接'}`);
        
        // 檢查穩定性
        if (uptime > lastUptime) {
          stableCount++;
          console.log(`  穩定性: ✅ 穩定運行 (${stableCount}次檢查)`);
        } else if (uptime < 60) {
          console.log(`  穩定性: 🔄 可能剛重啟 (<1分鐘)`);
          stableCount = 0;
        } else {
          console.log(`  穩定性: ⚠️  運行時間減少，可能不穩定`);
        }
        
        lastUptime = uptime;
        
        // 判斷是否穩定
        if (stableCount >= 3) {
          console.log('\n' + '='.repeat(60));
          console.log('🎉 服務已穩定運行！');
          console.log('='.repeat(60));
          console.log(`運行時間: ${Math.floor(uptime/60)}分${uptime%60}秒`);
          console.log(`資料庫: ${result.database?.connected ? '已連接' : '未連接'}`);
          console.log(`版本: ${result.version}`);
          console.log('');
          console.log('🚀 現在可以:');
          console.log('1. 清除瀏覽器緩存');
          console.log('2. 訪問前端網站測試');
          console.log('3. 驗證多設備同步');
          process.exit(0);
        }
        
        // 繼續檢查或結束
        if (stableCount < MAX_CHECKS) {
          setTimeout(checkService, CHECK_INTERVAL);
        } else {
          console.log('\n⚠️  監控結束，服務可能還在部署中');
          console.log('建議等待幾分鐘再測試');
          process.exit(1);
        }
        
      } catch (error) {
        console.log('  解析錯誤，服務可能正在部署...');
        setTimeout(checkService, CHECK_INTERVAL);
      }
    });
  }).on('error', (error) => {
    console.log('  服務暫時不可用，可能正在部署...');
    setTimeout(checkService, CHECK_INTERVAL);
  });
}

// 開始檢查
checkService();

console.log('\n📅 穩定性檢查計劃:');
console.log('  每30秒檢查一次');
console.log('  連續3次穩定運行 = 服務穩定');
console.log('  最多檢查12次 (6分鐘)');
console.log('\n💡 提示: 滾動部署時服務可能暫時不穩定，這是正常的');