#!/bin/bash

echo "🚀 強制部署 PostgreSQL 版本"
echo "=========================="
echo "時間: $(date)"
echo ""

cd /home/node/.openclaw/workspace/taiwan-landlord-backend

# 1. 確保所有檔案正確
echo "1. 檢查檔案..."
if [ ! -f "simple-api-fixed.js" ]; then
    echo "❌ 找不到 simple-api-fixed.js"
    exit 1
fi

if [ ! -f "Dockerfile" ]; then
    echo "❌ 找不到 Dockerfile"
    exit 1
fi

echo "✅ 檔案檢查完成"

# 2. 創建部署標記檔案
echo "2. 創建部署標記..."
cat > DEPLOYMENT_MARKER.md << EOF
# 部署標記
- 時間: $(date -Iseconds)
- 版本: 2.0.0
- 服務: 台灣房東-越南租客系統 API (PostgreSQL 版本)
- 提交: $(git rev-parse --short HEAD)
- 目的: 強制觸發 Zeabur 部署 PostgreSQL 版本
- 預期: 健康檢查顯示 PostgreSQL 連接狀態
EOF

echo "✅ 部署標記創建完成"

# 3. 更新版本信息
echo "3. 更新版本信息..."
if grep -q "version.*2.0.0" simple-api-fixed.js; then
    echo "✅ 版本已設置為 2.0.0"
else
    echo "⚠️  版本不是 2.0.0，正在更新..."
    sed -i "s/version: '1.0.0'/version: '2.0.0'/g" simple-api-fixed.js
    sed -i "s/version: '1.0.0'/version: '2.0.0'/g" simple-api-fixed.js
fi

# 4. 提交更改
echo "4. 提交更改到 GitHub..."
git add .
git commit -m "force: 強制部署 PostgreSQL 版本 2.0.0

- 添加部署標記檔案
- 確保版本為 2.0.0
- 強制觸發 Zeabur 重新部署
- 預期健康檢查顯示 PostgreSQL 連接狀態" || echo "⚠️  提交失敗或沒有更改"

# 5. 推送到 GitHub
echo "5. 推送到 GitHub..."
git push origin main

echo ""
echo "✅ 強制部署觸發完成！"
echo ""
echo "📋 下一步:"
echo "1. 登入 Zeabur 控制台: https://zeabur.com"
echo "2. 找到 'taiwan-landlord-test' 專案"
echo "3. 點擊「重新部署」或「Deploy Now」"
echo "4. 選擇 main 分支"
echo "5. 等待 5-10 分鐘"
echo ""
echo "🔍 部署後檢查:"
echo "curl https://taiwan-landlord-test.zeabur.app/health"
echo ""
echo "🎯 預期結果:"
echo '{"service": "台灣房東-越南租客系統 API (PostgreSQL 版本)", "version": "2.0.0"}'