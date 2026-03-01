#!/bin/bash

echo "🔍 監控部署進度"
echo "================"
echo "開始時間: $(date)"
echo "Git 提交: d28e1fc (修復數據同步)"
echo ""

API_URL="https://taiwan-landlord-test.zeabur.app"
MAX_ATTEMPTS=30
ATTEMPT=1
SLEEP_TIME=30

echo "等待 Zeabur 自動部署..."
echo "預計等待時間: $((MAX_ATTEMPTS * SLEEP_TIME / 60)) 分鐘"
echo ""

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "嘗試 $ATTEMPT/$MAX_ATTEMPTS - $(date '+%H:%M:%S')"
    
    # 測試健康檢查
    echo -n "健康檢查: "
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null)
    
    if [ "$RESPONSE" = "200" ]; then
        HEALTH_DATA=$(curl -s "$API_URL/health")
        VERSION=$(echo "$HEALTH_DATA" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        SERVICE=$(echo "$HEALTH_DATA" | grep -o '"service":"[^"]*"' | cut -d'"' -f4)
        
        echo "✅ HTTP $RESPONSE - $SERVICE (v$VERSION)"
        
        # 檢查是否是新版本
        if echo "$SERVICE" | grep -q "PostgreSQL"; then
            echo ""
            echo "🎉 部署成功！"
            echo "================"
            echo "新版本已上線: $SERVICE"
            echo "版本: $VERSION"
            echo "時間: $(date)"
            echo ""
            
            # 運行完整測試
            echo "🧪 運行完整測試..."
            node test-sync-fixed.js
            
            exit 0
        else
            echo "   ⏳ 還是舊版本，等待部署完成..."
        fi
    else
        echo "❌ HTTP $RESPONSE - 服務可能正在部署中..."
    fi
    
    # 如果不是最後一次嘗試，等待
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "等待 ${SLEEP_TIME} 秒..."
        sleep $SLEEP_TIME
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    echo ""
done

echo "❌ 部署監控超時"
echo "================"
echo "經過 $((MAX_ATTEMPTS * SLEEP_TIME / 60)) 分鐘仍未檢測到新版本"
echo "可能原因:"
echo "1. Zeabur 自動部署需要更長時間"
echo "2. 部署過程中出現錯誤"
echo "3. 需要手動觸發部署"
echo ""
echo "建議:"
echo "1. 登入 Zeabur 控制台查看部署狀態"
echo "2. 檢查 GitHub Actions 運行狀態"
echo "3. 手動運行: zeabur deploy"
echo ""
echo "當前服務狀態:"
curl -s "$API_URL/health" | python3 -m json.tool 2>/dev/null || curl -s "$API_URL/health"

exit 1