import { Pool, PoolConfig } from 'pg';
import { config } from '../config';

// 資料庫連接配置
const dbConfig: PoolConfig = {
  connectionString: config.database.url,
  ssl: config.isProduction ? { rejectUnauthorized: false } : false,
  max: 20, // 最大連接數
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// 創建連接池
const pool = new Pool(dbConfig);

// 測試資料庫連接
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    console.log('✅ 資料庫連接成功');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ 資料庫連接失敗:', error);
    return false;
  }
};

// 執行查詢
export const query = async <T = any>(
  text: string,
  params?: any[]
): Promise<T[]> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (config.isDevelopment) {
      console.log('📊 執行查詢:', { text, duration, rows: result.rowCount });
    }
    
    return result.rows;
  } catch (error) {
    console.error('❌ 查詢錯誤:', { text, params, error });
    throw error;
  }
};

// 執行事務
export const transaction = async <T = any>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// 獲取單一行
export const queryOne = async <T = any>(
  text: string,
  params?: any[]
): Promise<T | null> => {
  const rows = await query<T>(text, params);
  return rows[0] || null;
};

// 關閉連接池
export const closePool = async (): Promise<void> => {
  await pool.end();
  console.log('🔌 資料庫連接池已關閉');
};

export default {
  pool,
  query,
  queryOne,
  transaction,
  testConnection,
  closePool,
};