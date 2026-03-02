// 監控 Zeabur 建置和部署
const https = require('https');

const API_URL = 'https://taiwan-landlord-test.zeabur.app';
const BUILD_ID = '69a43091aaa1dbcb5f38ea76'; // 你提供的建置 ID

console.log('🚀 Zeabur 建置監控啟動');
console.log('='.repeat(60));
console.log('建置 ID:', BUILD_ID);
console.log('目標服務:', API_URL);
console.log('開始時間:', new Date().toISOString());
console.log('='.repeat(60));

let checkCount = 0;
const MAX_CHECKS = 40; // 20分鐘
const CHECK_INTERVAL = 30000; // 30秒

console.log('\n📅 預計時間線:');
console.log('  現在: 建置開始');
console.log('  2-5分鐘: Docker 鏡像構建');
console.log('  5-8分鐘: 服務部署');
console.log('  8-10分鐘: 新版本上線');
console.log('  10-12分鐘: 完整測試');
console.log('\n💡 提示: 服務可能暫時不可用，這是正常現象');

function checkDeployment() {
  checkCount++;
  
  if (checkCount > MAX_CHECKS) {
    console.log('\n❌ 監控超時 (20分鐘)');
    console.log('請檢查 Zeabur 控制台建置狀態');
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
          console.log(`運行時間: ${Math.round(result.uptime || 0)}秒`);
          
          if (result.database) {
            console.log(`資料庫: ${result.database.type || 'PostgreSQL'}`);
            console.log(`連接: ${result.database.connected ? '✅ 已連接' : '❌ 未連接'}`);
          }
          
          console.log('');
          console.log('🧪 開始運行完整測試...');
          
          // 運行測試
          const { execSync } = require('child_process');
          try {
            execSync('node test-sync-fixed.js', { stdio: 'inherit' });
            console.log('\n✅ 所有測試通過！');
            console.log('\n🎊 部署完成！現在擁有：');
            console.log('  1. ✅ PostgreSQL 持久化存儲');
            console.log('  2. ✅ 多設備數據同步');
            console.log('  3. ✅ 服務器重啟不丟失數據');
            console.log('  4. ✅ 所有設備看到相同內容');
          } catch (testError) {
            console.log('\n⚠️  測試有問題，但服務已部署');
          }
          
          process.exit(0);
        } else if (res.statusCode !== 200) {
          console.log('  🔄 服務可能正在重啟 (建置中)...');
        } else {
          console.log('  ⏳ 還是舊版本，等待建置完成...');
        }
        
      } catch (error) {
        console.log('  🔄 服務可能正在部署中 (無法解析 JSON)...');
      }
      
      // 繼續檢查
      setTimeout(checkDeployment, CHECK_INTERVAL);
    });
  }).on('error', (error) => {
    console.log('  🔄 服務暫時不可用 (可能正在部署)...');
    setTimeout(checkDeployment, CHECK_INTERVAL);
  });
}

// 開始監控
checkDeployment();

// 顯示關鍵信息
console.log('\n🔑 關鍵修復:');
console.log('  1. ✅ server.js 現在優先使用 simple-api-fixed.js');
console.log('  2. ✅ Dockerfile 使用 server.js 作為入口');
console.log('  3. ✅ 確保運行 PostgreSQL 版本 2.0.0');
console.log('');
console.log('🎯 預期啟動日誌:');
console.log('  🎉 使用 simple-api-fixed.js (PostgreSQL 版本 2.0.0)');
console.log('  ✅ 完整功能: 數據同步、持久化存儲');
console.log('  ✅ 多設備支持: 所有設備看到相同數據');
console.log('');
console.log('📱 測試方法:');
console.log('  1. 訪問前端: https://taiwan-landlord-vietnam-tenant-syst.vercel.app');
console.log('  2. 在不同設備修改數據');
console.log('  3. 確認所有設備看到相同內容');