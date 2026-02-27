import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { UserRole } from '../types';

// 擴展 Express Request 類型
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        role: UserRole;
      };
    }
  }
}

// JWT 認證中間件
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 從 Header 獲取 Token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '未提供認證 Token',
        message: '請先登入系統',
      });
    }

    const token = authHeader.split(' ')[1];
    
    // 驗證 Token
    const payload = await authService.verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: '無效的 Token',
        message: 'Token 已過期或無效，請重新登入',
      });
    }

    // 將用戶信息附加到請求對象
    req.user = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    };

    // 記錄認證日誌
    logger.info(`用戶認證成功: ${payload.username} (${payload.role})`, {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('認證中間件錯誤:', error);
    return res.status(500).json({
      success: false,
      error: '伺服器內部錯誤',
      message: '認證過程發生錯誤',
    });
  }
};

// 角色權限檢查中間件
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未認證',
        message: '請先登入系統',
      });
    }

    const userRole = req.user.role;
    
    // 檢查用戶角色是否在允許的角色列表中
    if (!allowedRoles.includes(userRole)) {
      logger.warn(`權限不足: ${req.user.username} (${userRole}) 嘗試訪問 ${req.method} ${req.path}`, {
        allowedRoles,
        userRole,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        error: '權限不足',
        message: `您沒有權限執行此操作。需要角色: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

// 特定資源權限檢查（例如：只能修改自己的資料）
export const authorizeResource = (
  resourceType: string,
  getResourceOwnerId: (req: Request) => Promise<number | null>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未認證',
        message: '請先登入系統',
      });
    }

    const user = req.user;
    
    // 管理員可以訪問所有資源
    if (user.role === 'super_admin' || user.role === 'admin') {
      return next();
    }

    try {
      // 獲取資源所有者 ID
      const resourceOwnerId = await getResourceOwnerId(req);
      
      if (resourceOwnerId === null) {
        return res.status(404).json({
          success: false,
          error: '資源不存在',
          message: '請求的資源不存在',
        });
      }

      // 檢查是否是資源所有者
      if (resourceOwnerId !== user.userId) {
        logger.warn(`資源訪問被拒絕: 用戶 ${user.username} 嘗試訪問 ${resourceType}`, {
          userId: user.userId,
          resourceOwnerId,
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          error: '權限不足',
          message: '您只能訪問自己的資源',
        });
      }

      next();
    } catch (error) {
      logger.error('資源權限檢查錯誤:', error);
      return res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '權限檢查過程發生錯誤',
      });
    }
  };
};

// 速率限制中間件（簡單實現）
export const rateLimit = (windowMs: number, maxRequests: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    
    // 清理過期的記錄
    for (const [key, value] of requests.entries()) {
      if (now > value.resetTime) {
        requests.delete(key);
      }
    }

    // 獲取或創建該 IP 的記錄
    let record = requests.get(ip);
    
    if (!record) {
      record = { count: 0, resetTime: now + windowMs };
      requests.set(ip, record);
    }

    // 檢查是否超過限制
    if (record.count >= maxRequests) {
      logger.warn(`速率限制觸發: IP ${ip}`, {
        path: req.path,
        method: req.method,
        count: record.count,
        maxRequests,
      });

      return res.status(429).json({
        success: false,
        error: '請求過於頻繁',
        message: `請稍後再試。限制: ${maxRequests} 次請求每 ${windowMs / 1000 / 60} 分鐘`,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    // 增加計數
    record.count++;
    
    // 設置響應頭
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());

    next();
  };
};

// 輸入驗證中間件
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('請求驗證失敗:', {
          errors,
          path: req.path,
          method: req.method,
          ip: req.ip,
        });

        return res.status(400).json({
          success: false,
          error: '請求驗證失敗',
          message: '請檢查輸入資料',
          errors,
        });
      }

      // 驗證通過，清理資料
      req.body = result.data.body || {};
      req.query = result.data.query || {};
      req.params = result.data.params || {};

      next();
    } catch (error) {
      logger.error('請求驗證中間件錯誤:', error);
      return res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '請求驗證過程發生錯誤',
      });
    }
  };
};

// CORS 中間件
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  // 設置 CORS 頭部
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24小時

  // 處理預檢請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

// 錯誤處理中間件
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('未捕獲的錯誤:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?.username,
  });

  // 根據錯誤類型返回不同的狀態碼
  let statusCode = 500;
  let errorMessage = '伺服器內部錯誤';
  
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = '資料驗證失敗';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorMessage = '未授權訪問';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorMessage = '權限不足';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorMessage = '資源不存在';
  }

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    message: error.message,
    ...(config.isDevelopment && { stack: error.stack }),
  });
};

// 404 處理中間件
export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn(`404 未找到: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(404).json({
    success: false,
    error: '未找到',
    message: `路徑 ${req.originalUrl} 不存在`,
  });
};