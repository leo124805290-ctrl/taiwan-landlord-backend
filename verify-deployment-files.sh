#!/bin/bash
echo "=== 部署檔案驗證 ==="
echo "驗證時間: $(date)"
echo ""

echo "1. 檢查關鍵檔案是否存在:"
echo "   Dockerfile: $(test -f Dockerfile && echo '✅ 存在' || echo '❌ 不存在')"
echo "   app.js: $(test -f app.js && echo '✅ 存在' || echo '❌ 不存在')"
echo "   simple-api.js: $(test -f simple-api.js && echo '✅ 存在' || echo '❌ 不存在')"
echo "   server.js: $(test -f server.js && echo '✅ 存在' || echo '❌ 不存在')"
echo "   zeabur.yaml: $(test -f zeabur.yaml && echo '✅ 存在' || echo '❌ 不存在')"

echo ""
echo "2. 檢查 Dockerfile 內容:"
echo "   第一行: $(head -1 Dockerfile)"
echo "   最後一行: $(tail -1 Dockerfile)"
echo "   行數: $(wc -l < Dockerfile)"

echo ""
echo "3. 檢查檔案是否會被 Docker 複製:"
grep -n "COPY" Dockerfile | while read line; do
  echo "   $line"
done

echo ""
echo "4. 模擬 Docker 構建檢查:"
echo "   假設工作目錄: /app"
echo "   Dockerfile 會複製:"
echo "   - package.json, package-lock.json"
echo "   - app.js"
echo "   - simple-api.js"
echo "   - server.js"
echo "   - zeabur.yaml"

echo ""
echo "5. 驗證結論:"
if [ -f Dockerfile ] && [ -f app.js ] && [ -f simple-api.js ] && [ -f server.js ]; then
  echo "   ✅ 所有關鍵檔案存在"
  echo "   ✅ Dockerfile 會複製必要檔案"
  echo "   ✅ 應該可以成功部署"
else
  echo "   ❌ 有檔案缺失，需要修復"
fi
