#!/bin/bash

echo "🔍 檢查 Zeabur 專案狀態"
echo "========================"

# 可能的 Zeabur 專案名稱
PROJECT_NAMES=(
    "taiwan-landlord-test"
    "taiwan-landlord-backend"
    "taiwan-landlord"
    "taiwan-landlord-vietnam-tenant"
    "taiwan-landlord-api"
)

echo "測試可能的專案域名..."
echo ""

for project in "${PROJECT_NAMES[@]}"; do
    URL="https://${project}.zeabur.app"
    echo -n "測試 ${project}: "
    
    # 嘗試連接
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${URL}/health" 2>/dev/null)
    
    if [ "$STATUS" = "200" ]; then
        # 獲取服務信息
        INFO=$(curl -s "${URL}/health" 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print('✅ 運行中 -', data.get('service', '未知'), '| 版本:', data.get('version', '未知'))
except:
    print('✅ HTTP 200 (無法解析)')
" 2>/dev/null || echo "✅ HTTP 200")
        
        echo "$INFO"
        
        # 檢查是否是我們的服務
        if curl -s "${URL}/health" 2>/dev/null | grep -q "台灣房東"; then
            echo "   📍 這是我們的服務！"
            echo "   🔗 網址: $URL"
            echo ""
            echo "📋 服務詳情:"
            curl -s "${URL}/health" | python3 -m json.tool 2>/dev/null || curl -s "${URL}/health"
            echo ""
        fi
    elif [ "$STATUS" = "000" ]; then
        echo "❌ 域名不存在或無法連接"
    else
        echo "⚠️  HTTP $STATUS"
    fi
done

echo ""
echo "🔗 已知服務:"
echo "1. 前端網站: https://taiwan-landlord-vietnam-tenant-syst.vercel.app"
echo "2. 後端 API: https://taiwan-landlord-test.zeabur.app (當前運行舊版本)"
echo ""
echo "🎯 需要部署的: taiwan-landlord-backend 倉庫 (GitHub)"
echo "   最新提交: d28e1fc - 修復數據同步，使用 PostgreSQL 持久化存儲"
echo ""
echo "🚀 部署步驟:"
echo "1. 登入 Zeabur: https://zeabur.com"
echo "2. 找到對應的專案 (可能是 'taiwan-landlord-test')"
echo "3. 點擊「重新部署」或「Deploy Now」"
echo "4. 選擇 main 分支"
echo "5. 等待 5-10 分鐘"