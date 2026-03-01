// 直接部署監控
const https = require('https');

const API_URL = 'https://taiwan-landlord-test.zeabur.app';
const MAX_CHECKS = 40; // 20分鐘
const CHECK_INTERVAL = 30000; // 30秒

console.log('🚀 直接部署監控啟動');
console.log('時間:', new Date().toISOString());
console.log('目標:', API_URL);
console.log('提交: 3ff7394 (強制觸發部署)');
console.log('='.repeat(60));

let checkCount = 0;
let deploymentDetected = false;

function checkDeployment() {
  checkCount++;
  
  if (checkCount > MAX_CHECKS) {
    console.log('\n❌ 部署監控超時 (20分鐘)');
    console.log('建議檢查:');
    console.log('1. Zeabur 控制台部署狀態');
    console.log('2. GitHub 倉庫 webhook 設置');
    console.log('3. Zeabur 專案配置');
    process.exit(1);
  }
  
  const elapsedMinutes = Math.floor(checkCount * 30 / 60);
  const elapsedSeconds = (checkCount * 30) % 60;
  
  console.log(`\n檢查 ${checkCount}/${MAX_CHECKS} (${elapsedMinutes}分${elapsedSeconds}秒)`);
  
  https.get(`${API_URL}/health`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        const serviceName = result.service || '';
        const version = result.version || '';
        
        console.log(`  狀態: ${res.statusCode}`);
        console.log(`  服務: ${serviceName}`);
        console.log(`  版本: ${version}`);
        
        if (serviceName.includes('PostgreSQL')) {
          console.log('\n' + '='.repeat(60));
          console.log('🎉 PostgreSQL 版本部署成功！');
          console.log('='.repeat(60));
          console.log(`服務: ${serviceName}`);
          console.log(`版本: ${version}`);
          console.log(`環境: ${result.environment}`);
          console.log(`資料庫: ${result.database?.type || 'PostgreSQL'}`);
          console.log(`連接: ${result.database?.connected ? '✅ 已連接' : '❌ 未連接'}`);
          console.log('');
          
          // 立即測試
          console.log('🧪 開始運行完整測試...');
          require('child_process').execSync('node test-sync-fixed.js', { stdio: 'inherit' });
          
          process.exit(0);
        } else if (res.statusCode !== 200) {
          console.log('  ⚠️  服務可能正在重啟...');
          deploymentDetected = true;
        } else {
          console.log('  ⏳ 還是舊版本...');
        }
        
      } catch (error) {
        console.log('  🔄 服務可能正在部署中 (無法解析 JSON)...');
        deploymentDetected = true;
      }
      
      // 繼續檢查
      setTimeout(checkDeployment, CHECK_INTERVAL);
    });
  }).on('error', (error) => {
    console.log('  🔄 服務暫時不可用 (可能正在部署)...');
    deploymentDetected = true;
    setTimeout(checkDeployment, CHECK_INTERVAL);
  });
}

// 開始監控
checkDeployment();

// 顯示預計時間
console.log('\n📅 預計時間線:');
console.log('  現在: 開始監控');
console.log('  2-5分鐘: 服務可能暫時不可用 (部署中)');
console.log('  5-10分鐘: 新版本應該上線');
console.log('  10-15分鐘: 完整測試完成');
console.log('\n💡 提示: 服務暫時中斷是正常現象，表示正在部署新版本');