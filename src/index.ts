import express = require('express');
import helmet = require('helmet');
import { config } from './config';
import { logger, requestLogger, logAppStart } from './utils/logger';
import { testConnection } from './db';
import { authService } from './services/auth.service';
import { runMigrations } from './db/migrate';
import { corsMiddleware, errorHandler, notFoundHandler } from './middleware/auth.middleware';

// 導入路由
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import propertyRoutes from './routes/property.routes';
import syncRoutes from './routes/sync.routes';

// 創建 Express 應用
const app = express();

// 安全中間件
app.use(helmet({
  contentSecurityPolicy: config.isProduction,
  crossOriginEmbedderPolicy: config.isProduction,
}));

// CORS 中間件
app.use(corsMiddleware);

// 請求解析中間件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 請求日誌中間件
app.use(requestLogger);

// 健康檢查端點
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    service: '台灣房東-越南租客系統 API',
    version: '1.0.0',
    environment: config.env,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API 文檔端點
app.get('/api-docs', (_req: express.Request, res: express.Response) => {
  res.json({
    name: '台灣房東-越南租客系統 API',
    version: '1.0.0',
    endpoints: {
      auth: `${config.apiPrefix}/auth`,
      users: `${config.apiPrefix}/users`,
      properties: `${config.apiPrefix}/properties`,
      rooms: `${config.apiPrefix}/rooms`,
      payments: `${config.apiPrefix}/payments`,
    },
    authentication: 'Bearer Token',
    rateLimit: `${config.rateLimit.max} requests per ${config.rateLimit.windowMs / 1000 / 60} minutes`,
  });
});

// API 路由
app.use(config.apiPrefix, authRoutes);
app.use(config.apiPrefix, userRoutes);
app.use(config.apiPrefix, propertyRoutes);
app.use(config.apiPrefix, syncRoutes);

// 404 處理
app.use(notFoundHandler);

// 錯誤處理
app.use(errorHandler);

// 啟動函數
async function startServer() {
  try {
    logger.info('🚀 正在啟動應用...');
    
    // 1. 測試資料庫連接
    logger.info('🔗 測試資料庫連接...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      throw new Error('無法連接到資料庫，請檢查 DATABASE_URL 配置');
    }
    
    // 2. 執行資料庫遷移
    logger.info('🔧 執行資料庫遷移...');
    await runMigrations();
    
    // 3. 創建初始管理員帳號
    logger.info('👤 創建初始管理員帳號...');
    await authService.createInitialAdmin();
    
    // 4. 啟動伺服器
    const server = app.listen(config.port, () => {
      logAppStart(config.port);
    });
    
    // 優雅關閉處理
    const gracefulShutdown = async (signal: string) => {
      logger.info(`收到 ${signal} 信號，開始優雅關閉...`);
      
      server.close(async () => {
        logger.info('HTTP 伺服器已關閉');
        
        // 關閉資料庫連接池
        // await closePool();
        
        logger.info('應用關閉完成');
        process.exit(0);
      });
      
      // 如果 10 秒後還沒關閉，強制退出
      setTimeout(() => {
        logger.error('強制關閉應用');
        process.exit(1);
      }, 10000);
    };
    
    // 註冊關閉信號
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // 未捕獲的異常處理
    process.on('uncaughtException', (error) => {
      logger.error('未捕獲的異常:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未處理的 Promise 拒絕:', { reason, promise });
    });
    
  } catch (error) {
    logger.error('應用啟動失敗:', error);
    process.exit(1);
  }
}

// 如果是直接執行此文件，則啟動伺服器
if (require.main === module) {
  startServer();
}

export default app;