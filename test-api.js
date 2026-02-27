// 簡單的 API 測試腳本
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`狀態碼: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('響應數據:', JSON.stringify(json, null, 2));
      if (json.status === 'healthy') {
        console.log('✅ API 健康檢查通過');
        process.exit(0);
      } else {
        console.log('❌ API 健康檢查失敗');
        process.exit(1);
      }
    } catch (error) {
      console.log('❌ 無法解析響應:', error.message);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ 請求失敗:', error.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('❌ 請求超時');
  req.destroy();
  process.exit(1);
});

req.end();