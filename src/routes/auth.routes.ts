import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { authenticate, validateRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// 註冊請求驗證 schema
const registerSchema = z.object({
  body: z.object({
    username: z.string()
      .min(3, '用戶名至少3個字符')
      .max(20, '用戶名最多20個字符')
      .regex(/^[a-zA-Z0-9_]+$/, '用戶名只能包含字母、數字和下劃線'),
    password: z.string()
      .min(8, '密碼至少8個字符')
      .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, '密碼必須包含字母和數字'),
    role: z.enum(['super_admin', 'admin', 'viewer']),
    full_name: z.string().optional(),
    email: z.string().email('無效的郵箱格式').optional(),
    phone: z.string().optional(),
  }),
});

// 登入請求驗證 schema
const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, '請輸入用戶名'),
    password: z.string().min(1, '請輸入密碼'),
  }),
});

// 修改密碼請求驗證 schema
const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, '請輸入舊密碼'),
    newPassword: z.string()
      .min(8, '新密碼至少8個字符')
      .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, '新密碼必須包含字母和數字'),
  }),
});

// 重置密碼請求驗證 schema（管理員用）
const resetPasswordSchema = z.object({
  body: z.object({
    userId: z.number().int().positive('用戶ID必須是正整數'),
    newPassword: z.string()
      .min(8, '新密碼至少8個字符')
      .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, '新密碼必須包含字母和數字'),
  }),
});

/**
 * @route POST /auth/register
 * @description 註冊新用戶
 * @access 公開（生產環境應該限制）
 */
router.post(
  '/auth/register',
  validateRequest(registerSchema),
  async (req, res) => {
    try {
      const { username, password, role, full_name, email, phone } = req.body;
      
      // 獲取客戶端信息
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');
      
      const result = await authService.register({
        username,
        password,
        role,
        full_name,
        email,
        phone,
      });
      
      logger.info(`新用戶註冊成功: ${username} (${role})`, {
        ip: ipAddress,
        userAgent,
      });
      
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            username: result.user.username,
            role: result.user.role,
            full_name: result.user.full_name,
            email: result.user.email,
            phone: result.user.phone,
            status: result.user.status,
            created_at: result.user.created_at,
          },
          token: result.token,
        },
        message: '註冊成功',
      });
    } catch (error: any) {
      logger.error('用戶註冊失敗:', error);
      
      let statusCode = 500;
      let errorMessage = '註冊失敗';
      
      if (error.message === '用戶名已存在') {
        statusCode = 409;
        errorMessage = error.message;
      } else if (error.message.includes('密碼')) {
        statusCode = 400;
        errorMessage = error.message;
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
      });
    }
  }
);

/**
 * @route POST /auth/login
 * @description 用戶登入
 * @access 公開
 */
router.post(
  '/auth/login',
  validateRequest(loginSchema),
  async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // 獲取客戶端信息
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');
      
      const result = await authService.login(username, password, ipAddress, userAgent);
      
      res.json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            username: result.user.username,
            role: result.user.role,
            full_name: result.user.full_name,
            email: result.user.email,
            phone: result.user.phone,
            status: result.user.status,
            last_login: result.user.last_login,
          },
          token: result.token,
        },
        message: '登入成功',
      });
    } catch (error: any) {
      logger.warn('用戶登入失敗:', {
        username: req.body.username,
        ip: req.ip,
        error: error.message,
      });
      
      res.status(401).json({
        success: false,
        error: '登入失敗',
        message: '用戶名或密碼錯誤',
      });
    }
  }
);

/**
 * @route GET /auth/me
 * @description 獲取當前用戶信息
 * @access 需要認證
 */
router.get(
  '/auth/me',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const user = await authService.getCurrentUser(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用戶不存在',
          message: '用戶已被刪除或不存在',
        });
      }
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            status: user.status,
            last_login: user.last_login,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
        },
        message: '獲取用戶信息成功',
      });
    } catch (error) {
      logger.error('獲取用戶信息失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '獲取用戶信息失敗',
      });
    }
  }
);

/**
 * @route POST /auth/change-password
 * @description 修改當前用戶密碼
 * @access 需要認證
 */
router.post(
  '/auth/change-password',
  authenticate,
  validateRequest(changePasswordSchema),
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { oldPassword, newPassword } = req.body;
      
      await authService.changePassword(userId, oldPassword, newPassword);
      
      logger.info(`用戶修改密碼成功: ${req.user!.username}`);
      
      res.json({
        success: true,
        message: '密碼修改成功',
      });
    } catch (error: any) {
      logger.error('修改密碼失敗:', error);
      
      let statusCode = 500;
      let errorMessage = '修改密碼失敗';
      
      if (error.message === '舊密碼錯誤') {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.message.includes('密碼')) {
        statusCode = 400;
        errorMessage = error.message;
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
      });
    }
  }
);

/**
 * @route POST /auth/reset-password
 * @description 管理員重置用戶密碼
 * @access 需要超級管理員權限
 */
router.post(
  '/auth/reset-password',
  authenticate,
  validateRequest(resetPasswordSchema),
  async (req, res) => {
    try {
      const adminId = req.user!.userId;
      const { userId, newPassword } = req.body;
      
      // 檢查管理員權限
      if (req.user!.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: '權限不足',
          message: '只有超級管理員可以重置密碼',
        });
      }
      
      await authService.resetPassword(adminId, userId, newPassword);
      
      logger.info(`管理員重置用戶密碼: ${req.user!.username} -> 用戶 ${userId}`);
      
      res.json({
        success: true,
        message: '密碼重置成功',
      });
    } catch (error: any) {
      logger.error('重置密碼失敗:', error);
      
      let statusCode = 500;
      let errorMessage = '重置密碼失敗';
      
      if (error.message === '權限不足') {
        statusCode = 403;
        errorMessage = error.message;
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
      });
    }
  }
);

/**
 * @route POST /auth/logout
 * @description 用戶登出（客戶端應刪除 Token）
 * @access 需要認證
 */
router.post(
  '/auth/logout',
  authenticate,
  async (req, res) => {
    try {
      logger.info(`用戶登出: ${req.user!.username}`, {
        ip: req.ip,
      });
      
      res.json({
        success: true,
        message: '登出成功',
      });
    } catch (error) {
      logger.error('登出處理失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: '登出處理失敗',
      });
    }
  }
);

/**
 * @route GET /auth/validate
 * @description 驗證 Token 有效性
 * @access 需要認證
 */
router.get(
  '/auth/validate',
  authenticate,
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          valid: true,
          user: req.user,
          expiresIn: '7d', // 從配置中獲取
        },
        message: 'Token 有效',
      });
    } catch (error) {
      logger.error('Token 驗證失敗:', error);
      res.status(500).json({
        success: false,
        error: '伺服器內部錯誤',
        message: 'Token 驗證失敗',
      });
    }
  }
);

export default router;