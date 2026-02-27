# 使用 Node.js 18 Alpine 作為基礎鏡像
FROM node:18-alpine AS builder

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝所有依賴（包括開發依賴，用於構建）
RUN npm ci

# 複製源代碼
COPY . .

# 構建 TypeScript
RUN npm run build

# 生產階段
FROM node:18-alpine AS production

# 安裝必要的工具
RUN apk add --no-cache tzdata curl

# 設置時區
ENV TZ=Asia/Taipei

# 創建非 root 用戶
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 設置工作目錄
WORKDIR /app

# 從構建階段複製 node_modules 和構建結果
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# 創建日誌目錄
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# 切換到非 root 用戶
USER nodejs

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 暴露端口
EXPOSE 3001

# 啟動命令
CMD ["npm", "start"]