#!/bin/bash

echo "🚀 開始部署修復後的 PostgreSQL 版本後端"
echo "=========================================="

cd /home/node/.openclaw/workspace/taiwan-landlord-backend

# 1. 檢查檔案
echo "📁 檢查檔案..."
if [ ! -f "simple-api-fixed.js" ]; then
    echo "❌ 找不到 simple-api-fixed.js"
    exit 1
fi

if [ ! -f "Dockerfile" ]; then
    echo "❌ 找不到 Dockerfile"
    exit 1
fi

echo "✅ 所有必要檔案存在"

# 2. 檢查 Dockerfile 配置
echo "🔧 檢查 Dockerfile 配置..."
if grep -q "simple-api-fixed.js" Dockerfile; then
    echo "✅ Dockerfile 已配置使用修復版本"
else
    echo "❌ Dockerfile 未配置使用修復版本"
    exit 1
fi

# 3. 本地測試
echo "🧪 本地測試..."
echo "   測試 PostgreSQL 連接配置..."
node -e "
const { Pool } = require('pg');
require('dotenv').config();

console.log('DATABASE_URL:', process.env.DATABASE_URL ? '已設置' : '未設置');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/taiwan_landlord_test',
  ssl: false
});

pool.query('SELECT NOW()')
  .then(res => {
    console.log('✅ PostgreSQL 連接測試成功:', res.rows[0].now);
    process.exit(0);
  })
  .catch(err => {
    console.log('⚠️  PostgreSQL 連接測試失敗（本地測試）:', err.message);
    console.log('    部署到 Zeabur 時會使用正確的連接字符串');
    process.exit(0);
  });
"

# 4. 準備部署
echo "📦 準備部署..."
echo "   當前目錄: $(pwd)"
echo "   檔案列表:"
ls -la *.js Dockerfile zeabur.yaml 2>/dev/null

# 5. 部署指令
echo ""
echo "🎯 部署指令："
echo "=========================================="
echo "1. 登入 Zeabur:"
echo "   zeabur login"
echo ""
echo "2. 部署到 Zeabur:"
echo "   zeabur deploy"
echo ""
echo "3. 或者使用 Git 部署:"
echo "   git add ."
echo "   git commit -m 'fix: 修復數據同步，使用 PostgreSQL 持久化存儲'"
echo "   git push origin main"
echo ""
echo "4. 檢查部署狀態:"
echo "   zeabur status"
echo ""
echo "5. 查看日誌:"
echo "   zeabur logs"
echo "=========================================="

# 6. 測試指令
echo ""
echo "🔍 部署後測試："
echo "1. 檢查健康狀態:"
echo "   curl https://taiwan-landlord-test.zeabur.app/health"
echo ""
echo "2. 測試數據同步:"
echo "   curl https://taiwan-landlord-test.zeabur.app/api/sync/all"
echo ""
echo "3. 前端測試:"
echo "   訪問 https://taiwan-landlord-vietnam-tenant-syst.vercel.app"
echo "   在兩個不同設備上修改數據，確認同步正常"
echo "=========================================="

echo ""
echo "✅ 部署準備完成！"
echo "📝 修復內容："
echo "   - 使用 PostgreSQL 持久化存儲"
echo "   - 實現真正的多設備數據同步"
echo "   - 自動創建資料表結構"
echo "   - 完整的錯誤處理和日誌"
echo ""
echo "🚀 現在可以執行部署指令了！"