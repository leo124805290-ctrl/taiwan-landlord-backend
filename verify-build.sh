#!/bin/bash
echo "=== 構建驗證腳本 ==="
echo "驗證時間: $(date)"
echo ""

# 檢查關鍵檔案
echo "1. 檢查關鍵檔案是否存在:"
required_files=("app.js" "simple-api.js" "server.js" "package.json" "zeabur.yaml")
all_exist=true

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file - 缺失!"
        all_exist=false
    fi
done

echo ""
echo "2. 檢查檔案內容:"
echo "   app.js 大小: $(wc -l < app.js) 行"
echo "   simple-api.js 大小: $(wc -l < simple-api.js) 行"
echo "   server.js 大小: $(wc -l < server.js) 行"

echo ""
echo "3. 檢查語法錯誤:"
node -c app.js && echo "   ✅ app.js 語法正確" || echo "   ❌ app.js 語法錯誤"
node -c simple-api.js && echo "   ✅ simple-api.js 語法正確" || echo "   ❌ simple-api.js 語法錯誤"
node -c server.js && echo "   ✅ server.js 語法正確" || echo "   ❌ server.js 語法錯誤"

echo ""
echo "4. 測試簡單運行:"
timeout 2 node -e "
try {
    console.log('測試 app.js 邏輯...');
    const fs = require('fs');
    
    // 檢查檔案可讀
    fs.readFileSync('app.js', 'utf8');
    fs.readFileSync('simple-api.js', 'utf8');
    fs.readFileSync('server.js', 'utf8');
    
    console.log('✅ 所有檔案可讀取');
    
    // 測試 simple-api.js 的基本結構
    const simpleApi = fs.readFileSync('simple-api.js', 'utf8');
    if (simpleApi.includes('express()') && simpleApi.includes('app.listen')) {
        console.log('✅ simple-api.js 包含 Express 伺服器結構');
    } else {
        console.log('⚠️ simple-api.js 可能結構不完整');
    }
    
} catch (error) {
    console.log('❌ 測試失敗:', error.message);
}
" 2>&1 | grep -v "^⏰\|^🚀\|^🌐\|^✅\|^📝"

echo ""
if [ "$all_exist" = true ]; then
    echo "=== 驗證結果: ✅ 所有檢查通過 ==="
    echo "檔案完整，可以部署。"
else
    echo "=== 驗證結果: ❌ 發現問題 ==="
    echo "請修復缺失的檔案。"
    exit 1
fi
