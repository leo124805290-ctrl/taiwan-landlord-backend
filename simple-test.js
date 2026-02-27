// 簡單的 Express 測試伺服器
const express = require('express');
const app = express();
const port = 3001;

app.use(express.json());

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Taiwan Landlord API',
    version: '1.0.0'
  });
});

// 簡單的測試端點
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API 正在運行',
    data: {
      server_time: new Date().toISOString(),
      node_version: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `找不到路徑: ${req.path}`
  });
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('伺服器錯誤:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: '伺服器內部錯誤'
  });
});

app.listen(port, () => {
  console.log(`✅ 測試伺服器運行在 http://localhost:${port}`);
  console.log(`✅ 健康檢查: http://localhost:${port}/health`);
  console.log(`✅ API 測試: http://localhost:${port}/api/test`);
});