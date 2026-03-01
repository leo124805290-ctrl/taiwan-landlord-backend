// 快速測試腳本
const https = require('https');

const API_URL = 'https://taiwan-landlord-test.zeabur.app';

console.log('🔍 快速測試當前部署狀態');
console.log('時間:', new Date().toISOString());
console.log('API:', API_URL);
console.log('='.repeat(50));

// 測試健康檢查
https.get(`${API_URL}/health`, (res) => {
  console.log('健康檢查狀態:', res.statusCode);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('服務:', result.service);
      console.log('版本:', result.version);
      console.log('環境:', result.environment);
      console.log('資料庫:', result.database?.type || '未指定');
      
      if (result.service.includes('PostgreSQL')) {
        console.log('\n🎉 新版本已部署！');
        console.log('開始完整測試...');
        require('./test-sync-fixed.js');
      } else {
        console.log('\n⏳ 還是舊版本，等待部署...');
        console.log('建議:');
        console.log('1. 登入 Zeabur 控制台');
        console.log('2. 手動觸發重新部署');
        console.log('3. 或等待自動部署完成');
      }
    } catch (error) {
      console.log('解析錯誤:', error.message);
    }
  });
}).on('error', (error) => {
  console.log('請求失敗:', error.message);
});

// 同時測試同步端點
setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  console.log('測試同步端點...');
  
  https.get(`${API_URL}/api/sync/status`, (res) => {
    console.log('同步狀態:', res.statusCode);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('成功:', result.success);
        console.log('資料庫:', result.database || '未指定');
        console.log('物業數量:', result.counts?.properties || 0);
      } catch (error) {
        console.log('解析錯誤:', error.message);
      }
    });
  }).on('error', (error) => {
    console.log('同步測試失敗:', error.message);
  });
}, 1000);