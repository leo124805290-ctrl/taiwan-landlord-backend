# 部署指南（程式小白版）

## 🎯 兩個部署方案

### 方案 1：完整 TypeScript 版本（功能完整）
**優點**：完整功能，用戶管理，資料庫
**缺點**：需要 TypeScript 編譯

### 方案 2：簡單 JavaScript 版本（快速測試）
**優點**：簡單快速，無需編譯
**缺點**：只有基本功能

---

## 🚀 推薦：先試方案 2（簡單版）

### 步驟 1：修改 Zeabur 配置
1. 在 Zeabur 專案頁面
2. 點擊「Settings」
3. 找到「Dockerfile Path」
4. 修改為：`Dockerfile-simple`
5. 保存

### 步驟 2：設置環境變數
```
名稱：PORT
值：3001

名稱：NODE_ENV  
值：production

名稱：CORS_ORIGIN
值：http://localhost:3000,https://taiwan-landlord-vietnam-tenant-syst.vercel.app
```

### 步驟 3：重新部署
1. 點擊「Redeploy」
2. 等待 2-3 分鐘

### 步驟 4：測試
部署完成後，測試：
```bash
# 健康檢查
curl https://你的專案.zeabur.app/health

# API 文檔
curl https://你的專案.zeabur.app/api-docs

# 測試登入
curl -X POST https://你的專案.zeabur.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'
```

---

## 🔧 如果方案 2 成功，再試方案 1

### 修復 TypeScript 問題：
1. 我已修改了 `Dockerfile`（第 10 行）
2. 現在應該可以編譯 TypeScript 了

### 切換回完整版本：
1. 在 Zeabur 設置中
2. 將「Dockerfile Path」改回：`Dockerfile`
3. 添加必要的環境變數：
   ```
   JWT_SECRET=my-super-secret-key-for-development-123456
   ADMIN_PASSWORD=Admin123!
   DATABASE_URL=postgresql://...（Zeabur 會自動提供）
   ```
4. 重新部署

---

## 🆘 故障排除

### 如果還是失敗：
1. **查看日誌**：點擊「Logs」標籤
2. **常見錯誤**：
   - `tsc: not found` → 使用方案 2
   - `Cannot find module` → 檢查依賴安裝
   - `Connection refused` → 檢查端口設置

### 緊急方案：
如果兩個方案都失敗，我們可以：
1. 創建一個全新的 Zeabur 專案
2. 使用最簡單的「Hello World」API
3. 逐步添加功能

---

## 📞 需要幫助？

請提供：
1. **Zeabur 專案名稱**
2. **錯誤訊息截圖**
3. **你現在卡在哪一步**

我會一步一步指導你！

---

## ✅ 成功標誌

### 方案 2 成功：
- ✅ `GET /health` 返回 `{"status":"healthy"}`
- ✅ `GET /api-docs` 可訪問
- ✅ `POST /api/auth/login` 可測試登入

### 方案 1 成功：
- ✅ 以上所有功能
- ✅ `POST /api/auth/register` 可註冊用戶
- ✅ `GET /api/auth/me` 可獲取用戶信息
- ✅ `GET /api/properties` 可獲取物業列表

---

## 🎮 下一步

**建議流程**：
1. 先部署方案 2（簡單版）✅ 確認 Zeabur 能工作
2. 再部署方案 1（完整版）✅ 獲得完整功能
3. 連接前端應用 ✅ 完成系統整合

**有問題隨時問我！** 🚀