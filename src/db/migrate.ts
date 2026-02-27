import fs from 'fs';
import path from 'path';
import { query, testConnection } from './index';
import { config } from '../config';

// 遷移腳本目錄
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// 遷移記錄表
const MIGRATION_TABLE = `
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

// 獲取已應用的遷移
async function getAppliedMigrations(): Promise<string[]> {
  try {
    const rows = await query<{ name: string }>('SELECT name FROM migrations ORDER BY applied_at');
    return rows.map(row => row.name);
  } catch (error) {
    // 如果 migrations 表不存在，創建它
    await query(MIGRATION_TABLE);
    return [];
  }
}

// 獲取所有遷移文件
function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('📁 創建遷移目錄:', MIGRATIONS_DIR);
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return [];
  }
  
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort(); // 按文件名排序
}

// 執行單個遷移
async function runMigration(filename: string): Promise<void> {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf-8');
  
  console.log(`🚀 執行遷移: ${filename}`);
  
  try {
    // 在事務中執行遷移
    await query('BEGIN');
    
    // 執行 SQL
    await query(sql);
    
    // 記錄遷移
    await query('INSERT INTO migrations (name) VALUES ($1)', [filename]);
    
    await query('COMMIT');
    
    console.log(`✅ 遷移完成: ${filename}`);
  } catch (error) {
    await query('ROLLBACK');
    console.error(`❌ 遷移失敗: ${filename}`, error);
    throw error;
  }
}

// 主遷移函數
export async function runMigrations(): Promise<void> {
  console.log('🔧 開始資料庫遷移...');
  
  // 測試資料庫連接
  const connected = await testConnection();
  if (!connected) {
    throw new Error('無法連接到資料庫');
  }
  
  // 獲取已應用和待應用的遷移
  const appliedMigrations = await getAppliedMigrations();
  const migrationFiles = getMigrationFiles();
  
  console.log(`📊 遷移狀態: 已應用 ${appliedMigrations.length} 個，待應用 ${migrationFiles.length} 個`);
  
  // 執行未應用的遷移
  let appliedCount = 0;
  for (const filename of migrationFiles) {
    if (!appliedMigrations.includes(filename)) {
      await runMigration(filename);
      appliedCount++;
    } else {
      console.log(`⏭️  跳過已應用遷移: ${filename}`);
    }
  }
  
  if (appliedCount === 0) {
    console.log('✅ 所有遷移已是最新狀態');
  } else {
    console.log(`🎉 成功應用 ${appliedCount} 個遷移`);
  }
}

// 回滾遷移（開發用）
export async function rollbackMigration(filename: string): Promise<void> {
  console.log(`↩️  回滾遷移: ${filename}`);
  
  try {
    await query('DELETE FROM migrations WHERE name = $1', [filename]);
    console.log(`✅ 已移除遷移記錄: ${filename}`);
    console.log('⚠️  注意：SQL 變更需要手動回滾');
  } catch (error) {
    console.error(`❌ 回滾失敗: ${filename}`, error);
    throw error;
  }
}

// 查看遷移狀態
export async function migrationStatus(): Promise<void> {
  const appliedMigrations = await getAppliedMigrations();
  const migrationFiles = getMigrationFiles();
  
  console.log('📋 遷移狀態報告:');
  console.log('=' .repeat(50));
  
  for (const filename of migrationFiles) {
    const isApplied = appliedMigrations.includes(filename);
    const status = isApplied ? '✅ 已應用' : '⏳ 待應用';
    console.log(`${status} - ${filename}`);
  }
  
  console.log('=' .repeat(50));
  console.log(`總計: ${migrationFiles.length} 個遷移文件，${appliedMigrations.length} 個已應用`);
}

// CLI 支持
if (require.main === module) {
  const command = process.argv[2] || 'up';
  
  async function main() {
    try {
      switch (command) {
        case 'up':
          await runMigrations();
          break;
        case 'status':
          await migrationStatus();
          break;
        case 'rollback':
          const filename = process.argv[3];
          if (!filename) {
            console.error('請指定要回滾的遷移文件名');
            process.exit(1);
          }
          await rollbackMigration(filename);
          break;
        default:
          console.log('可用命令:');
          console.log('  npm run db:migrate up     - 執行所有未應用的遷移');
          console.log('  npm run db:migrate status - 查看遷移狀態');
          console.log('  npm run db:migrate rollback <filename> - 回滾指定遷移');
          break;
      }
    } catch (error) {
      console.error('❌ 遷移過程出錯:', error);
      process.exit(1);
    }
  }
  
  main();
}