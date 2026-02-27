import winston from 'winston';
import { config } from '../config';

// 定義日誌級別
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 根據環境設置日誌級別
const level = () => {
  return config.isDevelopment ? 'debug' : config.logLevel;
};

// 定義日誌顏色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// 添加顏色
winston.addColors(colors);

// 定義日誌格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// 定義日誌輸出
const transports = [
  // 控制台輸出
  new winston.transports.Console(),
  
  // 錯誤日誌文件
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // 所有日誌文件
  new winston.transports.File({
    filename: 'logs/all.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// 創建日誌實例
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// 請求日誌中間件
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  // 記錄請求開始
  logger.http(`→ ${req.method} ${req.originalUrl}`);
  
  // 響應完成時記錄
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'http';
    
    logger.log(logLevel, `← ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
};

// 錯誤日誌中間件
export const errorLogger = (error: Error, req?: any) => {
  const context = req ? `${req.method} ${req.originalUrl}` : '未知上下文';
  logger.error(`❌ 錯誤發生在 ${context}: ${error.message}`, {
    stack: error.stack,
    ...(req && {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.body,
      query: req.query,
      params: req.params,
    }),
  });
};

// 應用啟動日誌
export const logAppStart = (port: number) => {
  logger.info('='.repeat(50));
  logger.info(`🚀 應用啟動成功`);
  logger.info(`📡 環境: ${config.env}`);
  logger.info(`🌐 端口: ${port}`);
  logger.info(`🔗 API 前綴: ${config.apiPrefix}`);
  logger.info(`📊 日誌級別: ${level()}`);
  logger.info('='.repeat(50));
};

// 資料庫連接日誌
export const logDbConnection = (success: boolean, error?: any) => {
  if (success) {
    logger.info('✅ 資料庫連接成功');
  } else {
    logger.error('❌ 資料庫連接失敗', { error });
  }
};

// 安全警告日誌
export const logSecurityWarning = (type: string, details: any) => {
  logger.warn(`⚠️ 安全警告: ${type}`, details);
};

// 操作審計日誌
export const logAudit = (userId: number, action: string, resource: string, details: any) => {
  logger.info(`📝 操作審計: 用戶 ${userId} ${action} ${resource}`, details);
};

export default logger;