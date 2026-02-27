# 台灣房東-越南租客系統後端 API

這是一個為台灣房東和越南租客設計的租賃管理系統的後端 API。提供完整的用戶認證、物業管理、房間管理、付款記錄等功能。

## 🚀 快速開始

### 本地開發

1. **克隆專案**
   ```bash
   git clone https://github.com/leo124805290-ctrl/taiwan-landlord-backend.git
   cd taiwan-landlord-backend
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **設置環境變數**
   ```bash
   cp .env.example .env
   # 編輯 .env 文件，設置必要的環境變數
   ```

4. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

5. **訪問 API**
   - 健康檢查: http://localhost:3001/health
   - API 文檔: http://localhost:3001/api-docs

### 使用 Docker

```bash
# 構建鏡像
docker build -t taiwan-landlord-api .

# 運行容器
docker run -p 3001:3001 --env-file .env taiwan-landlord-api
```

## 📋 環境變數

| 變數名稱 | 描述 | 預設值 | 必需 |
|---------|------|--------|------|
| `NODE_ENV` | 運行環境 | `development` | 否 |
| `PORT` | 服務端口 | `3001` | 否 |
| `API_PREFIX` | API 前綴 | `/api` | 否 |
| `DATABASE_URL` | PostgreSQL 連接 URL | - | 是 |
| `JWT_SECRET` | JWT 簽名密鑰 | - | 是 |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` | 否 |
| `CORS_ORIGIN` | 允許的來源 | `*` | 否 |
| `ADMIN_USERNAME` | 初始管理員用戶名 | `admin` | 否 |
| `ADMIN_PASSWORD` | 初始管理員密碼 | `Admin123!` | 否 |
| `ADMIN_EMAIL` | 初始管理員郵箱 | - | 否 |

## 🗄️ 資料庫

### 遷移

```bash
# 執行資料庫遷移
npm run db:migrate up

# 查看遷移狀態
npm run db:migrate status

# 回滾遷移
npm run db:migrate rollback <filename>
```

### 表結構

主要數據表：
- `users` - 用戶表（三種角色：super_admin, admin, viewer）
- `properties` - 物業表
- `rooms` - 房間表
- `payments` - 付款記錄表
- `maintenance` - 維護記錄表
- `utility_expenses` - 水電費表
- `meter_readings` - 電錶記錄表
- `login_logs` - 登入記錄表
- `operation_logs` - 操作日誌表

## 🔐 API 認證

所有 API 請求（除了公開端點）都需要在 Header 中包含 Bearer Token：

```http
Authorization: Bearer <your-jwt-token>
```

### 獲取 Token

1. **註冊新用戶**（僅限開發環境）
   ```http
   POST /api/auth/register
   Content-Type: application/json

   {
     "username": "testuser",
     "password": "Test123!",
     "role": "admin"
   }
   ```

2. **用戶登入**
   ```http
   POST /api/auth/login
   Content-Type: application/json

   {
     "username": "admin",
     "password": "Admin123!"
   }
   ```

## 📡 API 端點

### 認證相關
- `POST /api/auth/register` - 註冊新用戶
- `POST /api/auth/login` - 用戶登入
- `GET /api/auth/me` - 獲取當前用戶信息
- `POST /api/auth/change-password` - 修改密碼
- `POST /api/auth/logout` - 用戶登出

### 用戶管理
- `GET /api/users` - 獲取用戶列表（需要 super_admin）
- `GET /api/users/:id` - 獲取單個用戶
- `PUT /api/users/:id` - 更新用戶信息
- `DELETE /api/users/:id` - 停用用戶（需要 super_admin）

### 物業管理
- `POST /api/properties` - 創建新物業（需要 admin）
- `GET /api/properties` - 獲取物業列表
- `GET /api/properties/:id` - 獲取物業詳情
- `PUT /api/properties/:id` - 更新物業信息（需要 admin）
- `DELETE /api/properties/:id` - 刪除物業（需要 super_admin）

### 房間管理
- `POST /api/rooms` - 創建新房間（需要 admin）
- `GET /api/rooms` - 獲取房間列表
- `GET /api/rooms/:id` - 獲取房間詳情
- `PUT /api/rooms/:id` - 更新房間信息（需要 admin）
- `DELETE /api/rooms/:id` - 刪除房間（需要 admin）

### 付款管理
- `POST /api/payments` - 創建付款記錄（需要 admin）
- `GET /api/payments` - 獲取付款列表
- `GET /api/payments/:id` - 獲取付款詳情
- `PUT /api/payments/:id` - 更新付款狀態（需要 admin）
- `DELETE /api/payments/:id` - 刪除付款記錄（需要 admin）

## 🚀 部署到 Zeabur

### 自動部署（推薦）

1. **在 Zeabur 創建新專案**
2. **連接 GitHub 儲存庫**
3. **Zeabur 會自動檢測並部署**

### 手動部署

```bash
# 安裝 Zeabur CLI
npm install -g @zeabur/cli

# 登入 Zeabur
zeabur login

# 部署到 Zeabur
zeabur deploy
```

### 環境變數設置

在 Zeabur 控制台設置以下環境變數：

1. **必需變數**：
   - `JWT_SECRET` - 長隨機字符串
   - `ADMIN_PASSWORD` - 初始管理員密碼

2. **可選變數**：
   - `CORS_ORIGIN` - 前端域名
   - `ADMIN_EMAIL` - 管理員郵箱

## 🛡️ 安全特性

- **JWT 認證** - 基於 Token 的認證
- **角色權限控制** - 三種用戶角色，不同權限
- **密碼哈希** - 使用 bcrypt 加密
- **速率限制** - 防止暴力破解
- **輸入驗證** - 使用 Zod schema 驗證
- **CORS 配置** - 控制跨域請求
- **操作日誌** - 記錄所有敏感操作

## 📊 監控和日誌

### 健康檢查
```bash
curl http://localhost:3001/health
```

### 日誌
- 日誌文件保存在 `logs/` 目錄
- 開發環境：控制台輸出彩色日誌
- 生產環境：JSON 格式日誌文件

## 🔧 開發

### 代碼結構
```
src/
├── config/          # 配置管理
├── db/             # 資料庫層
│   ├── migrations/ # 遷移腳本
│   └── index.ts    # 資料庫連接
├── middleware/      # Express 中間件
├── routes/         # API 路由
├── services/       # 業務邏輯層
├── types/          # TypeScript 類型定義
├── utils/          # 工具函數
└── index.ts        # 應用入口
```

### 開發命令
```bash
# 開發模式（熱重載）
npm run dev

# 構建生產版本
npm run build

# 啟動生產版本
npm start

# TypeScript 類型檢查
npm run type-check

# 執行資料庫遷移
npm run db:migrate up
```

## 🤝 貢獻

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 許可證

MIT License - 詳見 [LICENSE](LICENSE) 文件

## 📞 支持

如有問題，請：
1. 檢查 [Issues](https://github.com/leo124805290-ctrl/taiwan-landlord-backend/issues)
2. 創建新的 Issue
3. 或聯繫維護者

---

**台灣房東-越南租客系統** © 2026