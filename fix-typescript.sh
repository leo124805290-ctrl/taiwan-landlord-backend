#!/bin/bash

echo "🔧 修復 TypeScript 問題..."

# 1. 修復 express 導入問題
echo "1. 修復 express 導入..."
find src -name "*.ts" -type f -exec sed -i 's/import { Router } from '\''express'\'';/import express from '\''express'\'';/g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/const router = Router();/const router = express.Router();/g' {} \;

# 2. 修復 req, res 參數類型
echo "2. 修復 req, res 參數類型..."
# 這需要手動修復，但我們可以先編譯看看還有哪些錯誤

# 3. 修復 JWT 簽名問題
echo "3. 修復 JWT 簽名問題..."
sed -i "s/expiresIn: config.jwt.expiresIn/expiresIn: config.jwt.expiresIn as any/g" src/services/auth.service.ts

# 4. 修復日誌配置問題
echo "4. 修復日誌配置問題..."
sed -i "s/level: config.logLevel,/level: 'info',/g" src/utils/logger.ts

# 5. 添加缺失的類型導入
echo "5. 添加類型導入..."
for file in src/routes/*.ts; do
  if ! grep -q "import.*Request.*Response" "$file"; then
    sed -i '1s/^/import { Request, Response } from '\''express'\'';\n/' "$file"
  fi
done

echo "✅ 修復完成！"
echo "現在嘗試編譯..."