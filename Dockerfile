# 台灣房東系統 - 絕對可靠的 Dockerfile
FROM node:18-alpine

# 安裝必要工具
RUN apk add --no-cache tzdata curl

# 設置時區
ENV TZ=Asia/Taipei

# 創建非 root 用戶
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 設置工作目錄
WORKDIR /app

# 1. 首先複製 package.json
COPY package.json package-lock.json ./

# 2. 安裝生產依賴
RUN npm ci --only=production

# 3. 複製所有必要檔案
COPY simple-api-fixed.js ./
COPY server-fixed.js ./
COPY zeabur.yaml ./

# 4. 創建日誌目錄
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# 5. 切換到非 root 用戶
USER nodejs

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 暴露端口
EXPOSE 3001

# 啟動命令 - 使用修復後的入口文件，確保運行 PostgreSQL 版本
CMD ["node", "server-fixed.js"]
