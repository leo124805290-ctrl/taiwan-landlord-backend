#!/bin/bash

echo "🔍 測試 Zeabur 部署配置"
echo "========================"

echo "1. 檢查 Dockerfile-simple-fixed..."
if [ -f "Dockerfile-simple-fixed" ]; then
    echo "   ✅ Dockerfile-simple-fixed 存在"
    
    # 檢查 CMD
    if grep -q 'CMD \["node", "app.js"\]' Dockerfile-simple-fixed; then
        echo "   ✅ CMD 正確設置為 node app.js"
    else
        echo "   ❌ CMD 不正確"
    fi
    
    # 檢查是否跳過 TypeScript 編譯
    if ! grep -q "npm run build" Dockerfile-simple-fixed; then
        echo "   ✅ 跳過了 TypeScript 編譯 (npm run build)"
    else
        echo "   ❌ 仍然包含 TypeScript 編譯"
    fi
else
    echo "   ❌ Dockerfile-simple-fixed 不存在"
fi

echo ""
echo "2. 檢查 zeabur.yaml..."
if [ -f "zeabur.yaml" ]; then
    echo "   ✅ zeabur.yaml 存在"
    
    if grep -q "dockerfile: Dockerfile-simple-fixed" zeabur.yaml; then
        echo "   ✅ 使用正確的 Dockerfile"
    else
        echo "   ❌ 沒有使用 Dockerfile-simple-fixed"
    fi
else
    echo "   ❌ zeabur.yaml 不存在"
fi

echo ""
echo "3. 檢查 package.json..."
if [ -f "package.json" ]; then
    echo "   ✅ package.json 存在"
    
    if grep -q '"start": "node app.js"' package.json; then
        echo "   ✅ start 腳本正確設置為 node app.js"
    else
        echo "   ❌ start 腳本不正確"
    fi
else
    echo "   ❌ package.json 不存在"
fi

echo ""
echo "4. 檢查 app.js 語法..."
if [ -f "app.js" ]; then
    echo "   ✅ app.js 存在"
    
    if node -c app.js >/dev/null 2>&1; then
        echo "   ✅ app.js 語法正確"
    else
        echo "   ❌ app.js 有語法錯誤"
    fi
else
    echo "   ❌ app.js 不存在"
fi

echo ""
echo "5. 模擬 Zeabur 部署流程..."
echo "   步驟 1: 構建 Docker 鏡像 (使用 Dockerfile-simple-fixed)"
echo "   步驟 2: 安裝依賴 (npm ci --only=production)"
echo "   步驟 3: 啟動容器 (node app.js)"
echo "   步驟 4: app.js 重定向到 server.js"
echo "   步驟 5: server.js 使用 simple-api.js"
echo "   步驟 6: 應用程式啟動成功！"

echo ""
echo "📋 部署檢查清單："
echo "   [ ] Zeabur 控制台重新部署"
echo "   [ ] 查看構建日誌"
echo "   [ ] 檢查健康檢查端點"
echo "   [ ] 測試 API 功能"

echo ""
echo "🚀 下一步："
echo "   1. 前往 Zeabur 控制台"
echo "   2. 手動觸發重新部署"
echo "   3. 查看部署日誌"
echo "   4. 測試健康檢查: https://你的域名/health"

echo ""
echo "📝 注意：如果 Zeabur 仍然沒有自動更新，可能需要："
echo "   - 手動在 Zeabur 控制台點擊「重新部署」"
echo "   - 檢查 GitHub webhook 設定"
echo "   - 確認 Zeabur 專案連結到正確的 GitHub 儲存庫"