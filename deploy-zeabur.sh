#!/bin/bash

# Zeabur 部署腳本
# 使用提供的 Zeabur Token: sk-nt6z7fvk5ktfuvrwlyo6jvnxkkcum

set -e

echo "🚀 開始部署到 Zeabur..."

# 檢查必要的環境變數
if [ -z "$ZEABUR_TOKEN" ]; then
    echo "❌ 錯誤: ZEABUR_TOKEN 未設置"
    echo "請設置環境變數: export ZEABUR_TOKEN=sk-nt6z7fvk5ktfuvrwlyo6jvnxkkcum"
    exit 1
fi

# 檢查是否安裝了 Zeabur CLI
if ! command -v zeabur &> /dev/null; then
    echo "📦 安裝 Zeabur CLI..."
    npm install -g @zeabur/cli
fi

# 登入 Zeabur
echo "🔑 登入 Zeabur..."
zeabur login --token "$ZEABUR_TOKEN"

# 部署到 Zeabur
echo "🚀 部署到 Zeabur..."
zeabur deploy

echo "✅ 部署完成！"
echo ""
echo "📋 下一步："
echo "1. 在 Zeabur 控制台設置環境變數："
echo "   - JWT_SECRET (長隨機字符串)"
echo "   - ADMIN_PASSWORD (初始管理員密碼)"
echo "   - DATABASE_URL (Zeabur 會自動提供)"
echo ""
echo "2. 等待部署完成後，訪問 API："
echo "   - 健康檢查: https://your-project.zeabur.app/health"
echo "   - API 文檔: https://your-project.zeabur.app/api-docs"
echo ""
echo "3. 測試 API："
echo "   curl https://your-project.zeabur.app/health"
echo "   curl https://your-project.zeabur.app/api-docs"