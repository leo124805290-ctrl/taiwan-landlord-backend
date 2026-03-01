// 深度檢查部署狀態
const https = require('https');

const API_URL = 'https://taiwan-landlord-test.zeabur.app';

console.log('🔍 深度檢查部署狀態');
console.log('時間:', new Date().toISOString());
console.log('='.repeat(60));

// 檢查多個端點來確認服務狀態
const endpoints = [
  { path: '/health', name: '健康檢查' },
  { path: '/api-docs', name: 'API 文檔' },
  { path: '/api/sync/status', name: '同步狀態' },
  { path: '/api/sync/all', name: '同步數據' }
];

let completed = 0;

endpoints.forEach(endpoint => {
  https.get(`${API_URL}${endpoint.path}`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      completed++;
      
      try {
        const result = JSON.parse(data);
        
        console.log(`${endpoint.name}:`);
        console.log(`  狀態: ${res.statusCode}`);
        
        if (endpoint.path === '/health') {
          console.log(`  服務: ${result.service}`);
          console.log(`  版本: ${result.version}`);
          console.log(`  環境: ${result.environment}`);
          
          if (result.service.includes('PostgreSQL')) {
            console.log('  🎉 新版本已部署！');
            console.log(`  資料庫: ${result.database?.type || 'PostgreSQL'}`);
            console.log(`  連接: ${result.database?.connected ? '✅' : '❌'}`);
          } else {
            console.log('  ⏳ 舊版本運行中');
          }
        } else if (endpoint.path === '/api-docs') {
          console.log(`  名稱: ${result.name}`);
          console.log(`  版本: ${result.version}`);
        } else if (endpoint.path === '/api/sync/status') {
          console.log(`  成功: ${result.success}`);
          console.log(`  資料庫: ${result.database || '未指定'}`);
        } else if (endpoint.path === '/api/sync/all') {
          console.log(`  成功: ${result.success}`);
          console.log(`  物業: ${result.data?.properties?.length || 0}`);
          console.log(`  房間: ${result.data?.rooms?.length || 0}`);
          console.log(`  付款: ${result.data?.payments?.length || 0}`);
          console.log(`  租客: ${result.data?.tenants?.length || 0}`);
        }
        
      } catch (error) {
        console.log(`${endpoint.name}:`);
        console.log(`  狀態: ${res.statusCode}`);
        console.log(`  錯誤: 無法解析 JSON`);
      }
      
      console.log('');
      
      // 所有檢查完成後總結
      if (completed === endpoints.length) {
        console.log('='.repeat(60));
        console.log('📋 檢查完成總結');
        console.log('='.repeat(60));
        
        // 重新獲取健康檢查來判斷版本
        https.get(`${API_URL}/health`, (res) => {
          let healthData = '';
          res.on('data', chunk => healthData += chunk);
          res.on('end', () => {
            try {
              const health = JSON.parse(healthData);
              
              if (health.service.includes('PostgreSQL')) {
                console.log('🎉 新版本已成功部署！');
                console.log('');
                console.log('🚀 開始運行完整測試套件...');
                require('./test-sync-fixed.js');
              } else {
                console.log('⏳ 仍在運行舊版本');
                console.log('');
                console.log('可能原因:');
                console.log('1. Zeabur 部署還在進行中');
                console.log('2. 部署遇到錯誤');
                console.log('3. 需要更長時間構建');
                console.log('');
                console.log('建議:');
                console.log('1. 檢查 Zeabur 控制台部署狀態');
                console.log('2. 查看構建日誌');
                console.log('3. 等待 5-10 分鐘後重試');
              }
            } catch (error) {
              console.log('無法確定版本狀態');
            }
          });
        });
      }
    });
  }).on('error', (error) => {
    completed++;
    console.log(`${endpoint.name}:`);
    console.log(`  錯誤: ${error.message}`);
    console.log('');
    
    if (completed === endpoints.length) {
      console.log('❌ 服務可能正在部署或不可用');
    }
  });
});