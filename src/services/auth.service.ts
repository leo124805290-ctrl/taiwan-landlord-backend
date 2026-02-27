import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../db';
import { config } from '../config';
import { User, UserCreateInput, JwtPayload } from '../types';
import { logger } from '../utils/logger';

export class AuthService {
  // 生成密碼哈希
  private async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const saltRounds = 12;
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    return { hash, salt };
  }

  // 驗證密碼
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // 生成 JWT Token
  private generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });
  }

  // 註冊新用戶
  async register(userData: UserCreateInput): Promise<{ user: User; token: string }> {
    try {
      // 檢查用戶名是否已存在
      const existingUser = await queryOne<User>(
        'SELECT id FROM users WHERE username = $1',
        [userData.username]
      );

      if (existingUser) {
        throw new Error('用戶名已存在');
      }

      // 驗證密碼強度
      this.validatePassword(userData.password);

      // 生成密碼哈希
      const { hash, salt } = await this.hashPassword(userData.password);

      // 創建用戶
      const result = await queryOne<User>(
        `INSERT INTO users (
          username, password_hash, salt, role, full_name, email, phone, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          userData.username,
          hash,
          salt,
          userData.role,
          userData.full_name,
          userData.email,
          userData.phone,
          'active',
        ]
      );

      if (!result) {
        throw new Error('創建用戶失敗');
      }

      // 生成 Token
      const token = this.generateToken(result);

      // 記錄操作日誌
      await this.logOperation(result.id, 'register', 'user', result.id, {
        action: '用戶註冊',
        role: userData.role,
      });

      logger.info(`用戶註冊成功: ${userData.username} (${userData.role})`);

      return {
        user: result,
        token,
      };
    } catch (error) {
      logger.error('用戶註冊失敗:', error);
      throw error;
    }
  }

  // 用戶登入
  async login(username: string, password: string, ipAddress?: string, userAgent?: string): Promise<{ user: User; token: string }> {
    try {
      // 查找用戶
      const user = await queryOne<User>(
        'SELECT * FROM users WHERE username = $1 AND status = $2',
        [username, 'active']
      );

      if (!user) {
        await this.logFailedLogin(username, ipAddress, userAgent, '用戶不存在');
        throw new Error('用戶名或密碼錯誤');
      }

      // 驗證密碼
      const isValid = await this.verifyPassword(password, user.password_hash);
      if (!isValid) {
        await this.logFailedLogin(username, ipAddress, userAgent, '密碼錯誤');
        throw new Error('用戶名或密碼錯誤');
      }

      // 更新最後登入時間
      await query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // 生成 Token
      const token = this.generateToken(user);

      // 記錄成功登入
      await this.logLogin(user.id, true, ipAddress, userAgent);

      // 記錄操作日誌
      await this.logOperation(user.id, 'login', 'user', user.id, {
        action: '用戶登入',
        ipAddress,
      });

      logger.info(`用戶登入成功: ${username} (${user.role})`);

      return {
        user,
        token,
      };
    } catch (error) {
      logger.error('用戶登入失敗:', error);
      throw error;
    }
  }

  // 驗證 Token
  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      // 檢查用戶是否仍然存在且活躍
      const user = await queryOne<User>(
        'SELECT id, status FROM users WHERE id = $1',
        [payload.userId]
      );

      if (!user || user.status !== 'active') {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  // 獲取當前用戶
  async getCurrentUser(userId: number): Promise<User | null> {
    return queryOne<User>(
      'SELECT id, username, role, full_name, email, phone, status, last_login, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );
  }

  // 修改密碼
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      // 獲取當前用戶
      const user = await queryOne<User>(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (!user) {
        throw new Error('用戶不存在');
      }

      // 驗證舊密碼
      const isValid = await this.verifyPassword(oldPassword, user.password_hash);
      if (!isValid) {
        throw new Error('舊密碼錯誤');
      }

      // 驗證新密碼強度
      this.validatePassword(newPassword);

      // 生成新密碼哈希
      const { hash, salt } = await this.hashPassword(newPassword);

      // 更新密碼
      await query(
        'UPDATE users SET password_hash = $1, salt = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [hash, salt, userId]
      );

      // 記錄操作日誌
      await this.logOperation(userId, 'change_password', 'user', userId, {
        action: '修改密碼',
      });

      logger.info(`用戶修改密碼成功: ${userId}`);

      return true;
    } catch (error) {
      logger.error('修改密碼失敗:', error);
      throw error;
    }
  }

  // 重置密碼（管理員用）
  async resetPassword(adminId: number, userId: number, newPassword: string): Promise<boolean> {
    try {
      // 驗證管理員權限
      const admin = await queryOne<User>(
        'SELECT role FROM users WHERE id = $1',
        [adminId]
      );

      if (!admin || admin.role !== 'super_admin') {
        throw new Error('權限不足');
      }

      // 驗證新密碼強度
      this.validatePassword(newPassword);

      // 生成新密碼哈希
      const { hash, salt } = await this.hashPassword(newPassword);

      // 更新密碼
      await query(
        'UPDATE users SET password_hash = $1, salt = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [hash, salt, userId]
      );

      // 記錄操作日誌
      await this.logOperation(adminId, 'reset_password', 'user', userId, {
        action: '管理員重置密碼',
        targetUserId: userId,
      });

      logger.info(`管理員重置用戶密碼: ${adminId} -> ${userId}`);

      return true;
    } catch (error) {
      logger.error('重置密碼失敗:', error);
      throw error;
    }
  }

  // 創建初始管理員帳號
  async createInitialAdmin(): Promise<void> {
    try {
      // 檢查是否已有管理員
      const adminCount = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM users WHERE role = $1',
        ['super_admin']
      );

      if (parseInt(adminCount?.count || '0') > 0) {
        logger.info('已有管理員帳號，跳過初始創建');
        return;
      }

      // 創建初始管理員
      await this.register({
        username: config.admin.username,
        password: config.admin.password,
        role: 'super_admin',
        full_name: '系統管理員',
        email: config.admin.email,
      });

      logger.info('初始管理員帳號創建成功');
    } catch (error) {
      logger.error('創建初始管理員失敗:', error);
      // 不拋出錯誤，避免應用啟動失敗
    }
  }

  // 私有方法：密碼強度驗證
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('密碼至少需要8位數');
    }

    // 檢查包含字母和數字
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasLetter || !hasNumber) {
      throw new Error('密碼必須包含字母和數字');
    }

    // 可選：檢查特殊字符
    // const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    // if (!hasSpecialChar) {
    //   throw new Error('密碼必須包含至少一個特殊字符');
    // }
  }

  // 私有方法：記錄登入
  private async logLogin(userId: number, success: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      await query(
        `INSERT INTO login_logs (user_id, ip_address, user_agent, success)
         VALUES ($1, $2, $3, $4)`,
        [userId, ipAddress, userAgent, success]
      );
    } catch (error) {
      logger.error('記錄登入日誌失敗:', error);
    }
  }

  // 私有方法：記錄失敗登入
  private async logFailedLogin(username: string, ipAddress?: string, userAgent?: string, reason?: string): Promise<void> {
    try {
      // 嘗試查找用戶ID
      const user = await queryOne<{ id: number }>(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      await query(
        `INSERT INTO login_logs (user_id, ip_address, user_agent, success)
         VALUES ($1, $2, $3, $4)`,
        [user?.id || null, ipAddress, userAgent, false]
      );

      logger.warn(`登入失敗: ${username} - ${reason}`, { ipAddress });
    } catch (error) {
      logger.error('記錄失敗登入日誌失敗:', error);
    }
  }

  // 私有方法：記錄操作日誌
  private async logOperation(userId: number, actionType: string, resourceType: string, resourceId: number, details: any): Promise<void> {
    try {
      await query(
        `INSERT INTO operation_logs (user_id, action_type, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, actionType, resourceType, resourceId, JSON.stringify(details)]
      );
    } catch (error) {
      logger.error('記錄操作日誌失敗:', error);
    }
  }
}

export const authService = new AuthService();