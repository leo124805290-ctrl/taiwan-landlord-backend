# 前端連接指南

## 🚀 連接混合版本 API

### **步驟 1：設置前端環境變數**

#### **本地開發（.env.local）：**
```bash
# 複製 .env.example 為 .env.local
cp .env.example .env.local

# 編輯 .env.local，添加：
NEXT_PUBLIC_API_URL=https://taiwan-landlord-hybrid.zeabur.app/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### **Vercel 部署（控制台設置）：**
1. 訪問 Vercel 專案
2. 點擊「Settings」→ 「Environment Variables」
3. 添加：
   ```
   Name: NEXT_PUBLIC_API_URL
   Value: https://taiwan-landlord-hybrid.zeabur.app/api
   ```
4. 重新部署

### **步驟 2：修改前端 API 調用**

#### **當前前端使用 localStorage，需要修改為：**

**原來的 localStorage 調用：**
```javascript
// 從 localStorage 讀取數據
const data = JSON.parse(localStorage.getItem('taiwan-landlord-data'));
```

**修改為 API 調用：**
```javascript
// 從 API 讀取數據
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/properties`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
const data = await response.json();
```

### **步驟 3：添加認證處理**

在 `contexts/AppContext.tsx` 或類似文件中添加：

```typescript
// 登入函數
const login = async (username: string, password: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 保存 token 和用戶信息
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      return { success: true, user: data.data.user };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error) {
    return { success: false, error: '網絡錯誤' };
  }
};

// 檢查認證狀態
const checkAuth = async () => {
  const token = localStorage.getItem('token');
  if (!token) return { authenticated: false };
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { authenticated: true, user: data.data.user };
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { authenticated: false };
    }
  } catch (error) {
    return { authenticated: false };
  }
};
```

### **步驟 4：數據遷移腳本**

創建一個數據遷移腳本，將現有 localStorage 數據遷移到 API：

```javascript
// migration-script.js
async function migrateData() {
  // 1. 讀取現有 localStorage 數據
  const oldData = JSON.parse(localStorage.getItem('taiwan-landlord-data'));
  
  if (!oldData) {
    console.log('沒有找到舊數據');
    return;
  }
  
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('請先登入');
    return;
  }
  
  // 2. 遷移物業數據
  if (oldData.properties && oldData.properties.length > 0) {
    for (const property of oldData.properties) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/properties`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: property.name,
            address: property.address,
            owner_name: property.owner_name,
            owner_phone: property.owner_phone
          })
        });
        console.log(`已遷移物業: ${property.name}`);
      } catch (error) {
        console.error(`遷移物業失敗: ${property.name}`, error);
      }
    }
  }
  
  // 3. 遷移房間數據（需要先有物業 ID）
  // ... 類似邏輯
  
  console.log('數據遷移完成！');
}
```

### **步驟 5：逐步遷移策略**

#### **階段 1：並行運行**
- 前端同時支持 localStorage 和 API
- 新數據保存到 API，舊數據保持不變
- 添加「遷移到雲端」按鈕

#### **階段 2：完全遷移**
- 所有數據操作都通過 API
- 移除 localStorage 依賴
- 確保離線備份機制

### **步驟 6：測試連接**

#### **測試腳本：**
```bash
# 測試 API 連接
curl https://taiwan-landlord-hybrid.zeabur.app/health

# 測試前端環境變數
echo "API URL: $NEXT_PUBLIC_API_URL"

# 簡單的前端測試頁面
# 創建 pages/test-api.js
```

#### **測試頁面代碼：**
```javascript
// pages/test-api.js
export default function TestAPI() {
  const [status, setStatus] = useState('測試中...');
  
  useEffect(() => {
    testConnection();
  }, []);
  
  const testConnection = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`);
      const data = await response.json();
      setStatus(`✅ API 連接成功: ${data.status}`);
    } catch (error) {
      setStatus(`❌ API 連接失敗: ${error.message}`);
    }
  };
  
  return (
    <div>
      <h1>API 連接測試</h1>
      <p>API URL: {process.env.NEXT_PUBLIC_API_URL}</p>
      <p>狀態: {status}</p>
    </div>
  );
}
```

## 🔧 故障排除

### **常見問題：**

#### **1. CORS 錯誤**
```
Access to fetch at 'https://...' from origin 'http://localhost:3000' has been blocked by CORS policy
```
**解決方案：**
- 在 Zeabur 設置 `CORS_ORIGIN` 環境變數
- 或在前端使用代理

#### **2. 認證失敗**
```
401 Unauthorized
```
**解決方案：**
- 檢查 token 是否有效
- 重新登入獲取新 token
- 檢查 JWT_SECRET 設置

#### **3. 資料庫連接失敗**
```
database: "disconnected"
```
**解決方案：**
- 檢查 Zeabur 的 PostgreSQL 服務狀態
- 確認 DATABASE_URL 環境變數

#### **4. 前端環境變數不生效**
**解決方案：**
- 重啟開發伺服器
- 在 Vercel 重新部署
- 檢查變數名稱是否正確

## 🚀 快速開始

### **最簡單的連接方式：**

1. **只修改環境變數**（保持現有代碼不變）：
   ```bash
   NEXT_PUBLIC_API_URL=https://taiwan-landlord-hybrid.zeabur.app/api
   ```

2. **添加一個「保存到雲端」按鈕**，逐步遷移數據

3. **新功能使用 API**，舊功能保持 localStorage

### **混合模式示例：**
```javascript
// 智能數據獲取函數
async function getData(key) {
  // 先嘗試從 API 獲取
  try {
    const response = await fetch(`${API_URL}/${key}`);
    const data = await response.json();
    if (data.success) {
      // 同時保存到 localStorage 作為緩存
      localStorage.setItem(key, JSON.stringify(data.data));
      return data.data;
    }
  } catch (error) {
    // API 失敗，從 localStorage 獲取
    const localData = localStorage.getItem(key);
    if (localData) {
      return JSON.parse(localData);
    }
  }
  return null;
}
```

## 📞 需要幫助？

如果連接遇到問題：
1. 檢查 API 健康狀態
2. 查看瀏覽器控制台錯誤
3. 測試 API 端點是否可訪問
4. 聯繫系統管理員

**混合版本 GitHub:** https://github.com/leo124805290-ctrl/taiwan-landlord-hybrid
**API 網址:** https://taiwan-landlord-hybrid.zeabur.app