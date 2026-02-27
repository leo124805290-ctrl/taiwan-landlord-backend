# Zeabur 部署測試指南

## 部署步驟

### 1. 手動部署到 Zeabur

1. **訪問 Zeabur 控制台**: https://zeabur.com
2. **使用提供的 Token 登入**: `sk-nt6z7fvk5ktfuvrwlyo6jvnxkkcum`
3. **創建新專案**: "Taiwan Landlord Backend"
4. **連接 GitHub 儲存庫**: `leo124805290-ctrl/taiwan-landlord-backend`
5. **Zeabur 會自動檢測並部署**

### 2. 設置環境變數

在 Zeabur 控制台中設置以下環境變數：

#### 必需變數：
- `JWT_SECRET`: `your-super-secret-jwt-key-change-this-in-production`
- `ADMIN_PASSWORD`: `Admin123!` (至少8位，包含字母和數字)

#### 可選變數：
- `ADMIN_EMAIL`: `admin@example.com`
- `CORS_ORIGIN`: `http://localhost:3000,https://taiwan-landlord-vietnam-tenant-syst.vercel.app`

### 3. 測試部署

部署完成後，測試以下端點：

```bash
# 健康檢查
curl https://your-project.zeabur.app/health

# API 文檔
curl https://your-project.zeabur.app/api-docs

# 註冊測試用戶
curl -X POST https://your-project.zeabur.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testadmin",
    "password": "Test123!",
    "role": "admin"
  }'

# 登入測試
curl -X POST https://your-project.zeabur.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testadmin",
    "password": "Test123!"
  }'
```

## API 端點列表

### 公開端點
- `GET /health` - 健康檢查
- `GET /api-docs` - API 文檔
- `POST /api/auth/register` - 註冊用戶
- `POST /api/auth/login` - 用戶登入

### 需要認證的端點
- `GET /api/auth/me` - 獲取當前用戶
- `POST /api/auth/change-password` - 修改密碼
- `POST /api/auth/logout` - 用戶登出

### 用戶管理（需要 super_admin）
- `GET /api/users` - 用戶列表
- `GET /api/users/:id` - 獲取用戶詳情
- `PUT /api/users/:id` - 更新用戶
- `DELETE /api/users/:id` - 停用用戶

### 物業管理（需要 admin）
- `POST /api/properties` - 創建物業
- `GET /api/properties` - 物業列表
- `GET /api/properties/:id` - 物業詳情
- `PUT /api/properties/:id` - 更新物業
- `DELETE /api/properties/:id` - 刪除物業

## 故障排除

### 常見問題

1. **部署失敗**
   - 檢查環境變數是否正確設置
   - 查看 Zeabur 部署日誌

2. **資料庫連接失敗**
   - 確保 PostgreSQL 服務已啟動
   - 檢查 DATABASE_URL 環境變數

3. **API 返回 500 錯誤**
   - 檢查 JWT_SECRET 是否設置
   - 查看伺服器日誌

4. **CORS 錯誤**
   - 檢查 CORS_ORIGIN 環境變數
   - 確保前端域名在允許列表中

### 日誌查看

在 Zeabur 控制台中：
1. 選擇專案
2. 點擊 "Logs" 標籤
3. 查看實時日誌

## 後續開發

### 需要添加的功能
1. **房間管理 API** (`/api/rooms`)
2. **付款管理 API** (`/api/payments`)
3. **維護記錄 API** (`/api/maintenance`)
4. **補登功能 API** (`/api/backfill`)

### 前端連接
前端需要更新環境變數：
```env
NEXT_PUBLIC_API_URL=https://your-project.zeabur.app/api
```

### 安全性建議
1. 在生產環境中使用強密碼
2. 定期輪換 JWT_SECRET
3. 啟用 HTTPS
4. 設置速率限制
5. 監控 API 使用情況

## 聯繫支持

如有問題，請：
1. 查看 Zeabur 文檔
2. 檢查 GitHub Issues
3. 聯繫系統管理員