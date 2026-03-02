#!/usr/bin/env node

/**
 * 初始化 PostgreSQL 資料表
 * 解決 "relation does not exist" 錯誤
 */

const { Pool } = require('pg');
require('dotenv').config();

console.log('🚀 初始化 PostgreSQL 資料表');
console.log('時間:', new Date().toISOString());
console.log('='.repeat(60));

// 創建 PostgreSQL 連接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/taiwan_landlord_test',
  ssl: false,
});

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 連接 PostgreSQL...');
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ PostgreSQL 連接成功');
    console.log('   伺服器時間:', result.rows[0].current_time);
    console.log('   PostgreSQL 版本:', result.rows[0].pg_version.split('\n')[0]);
    
    // 檢查現有表
    console.log('\n🔍 檢查現有資料表...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const existingTables = tables.rows.map(row => row.table_name);
    console.log('   現有資料表:', existingTables);
    
    // 創建缺失的表
    console.log('\n🛠️  創建缺失的資料表...');
    
    // 1. 房間表 (如果不存在)
    if (!existingTables.includes('rooms')) {
      console.log('   創建 rooms 表...');
      await client.query(`
        CREATE TABLE rooms (
          id SERIAL PRIMARY KEY,
          property_id INTEGER,
          floor INTEGER DEFAULT 1,
          room_number VARCHAR(20) NOT NULL,
          status VARCHAR(20) DEFAULT 'available',
          tenant_name VARCHAR(100),
          tenant_phone VARCHAR(20),
          rent_amount INTEGER DEFAULT 0,
          deposit_amount INTEGER DEFAULT 0,
          check_in_date DATE,
          check_out_date DATE,
          current_meter INTEGER DEFAULT 0,
          previous_meter INTEGER DEFAULT 0,
          last_meter INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ rooms 表創建完成');
    }
    
    // 2. 付款表 (如果不存在)
    if (!existingTables.includes('payments')) {
      console.log('   創建 payments 表...');
      await client.query(`
        CREATE TABLE payments (
          id SERIAL PRIMARY KEY,
          room_id INTEGER,
          month VARCHAR(20) NOT NULL,
          rent_amount INTEGER DEFAULT 0,
          electricity_usage INTEGER DEFAULT 0,
          electricity_fee INTEGER DEFAULT 0,
          total_amount INTEGER DEFAULT 0,
          due_date DATE,
          paid_date DATE,
          status VARCHAR(20) DEFAULT 'pending',
          payment_method VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ payments 表創建完成');
    }
    
    // 3. 租客表 (如果不存在)
    if (!existingTables.includes('tenants')) {
      console.log('   創建 tenants 表...');
      await client.query(`
        CREATE TABLE tenants (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          room_id INTEGER,
          check_in_date DATE,
          check_out_date DATE,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ tenants 表創建完成');
    }
    
    // 4. 維護表 (如果不存在)
    if (!existingTables.includes('maintenance')) {
      console.log('   創建 maintenance 表...');
      await client.query(`
        CREATE TABLE maintenance (
          id SERIAL PRIMARY KEY,
          room_id INTEGER,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          urgency VARCHAR(20) DEFAULT 'normal',
          status VARCHAR(20) DEFAULT 'pending',
          report_date DATE DEFAULT CURRENT_DATE,
          repair_date DATE,
          cost INTEGER DEFAULT 0,
          technician VARCHAR(100),
          notes TEXT,
          category VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ maintenance 表創建完成');
    }
    
    // 5. 歷史表 (如果不存在)
    if (!existingTables.includes('history')) {
      console.log('   創建 history 表...');
      await client.query(`
        CREATE TABLE history (
          id SERIAL PRIMARY KEY,
          room_id INTEGER,
          tenant_name VARCHAR(100),
          month VARCHAR(20),
          rent_amount INTEGER DEFAULT 0,
          electricity_usage INTEGER DEFAULT 0,
          electricity_fee INTEGER DEFAULT 0,
          total_amount INTEGER DEFAULT 0,
          due_date DATE,
          paid_date DATE,
          status VARCHAR(20),
          payment_method VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ history 表創建完成');
    }
    
    // 再次檢查所有表
    console.log('\n🔍 最終資料表狀態...');
    const finalTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const finalTableNames = finalTables.rows.map(row => row.table_name);
    console.log('   所有資料表:', finalTableNames);
    
    // 檢查我們需要的表是否存在
    const requiredTables = ['rooms', 'payments', 'tenants', 'maintenance', 'history'];
    const missingTables = requiredTables.filter(table => !finalTableNames.includes(table));
    
    if (missingTables.length === 0) {
      console.log('\n🎉 所有必要資料表已創建完成！');
      console.log('✅ 系統現在可以正常運行');
    } else {
      console.log('\n⚠️  仍有缺失的表:', missingTables);
      console.log('   請手動創建這些表');
    }
    
  } catch (error) {
    console.error('❌ 初始化失敗:', error.message);
    console.error('詳細錯誤:', error);
  } finally {
    client.release();
    await pool.end();
    console.log('\n🔌 資料庫連接已關閉');
  }
}

// 執行初始化
initializeDatabase().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ 資料表初始化完成');
  console.log('='.repeat(60));
  console.log('\n🚀 現在可以測試同步功能:');
  console.log('curl https://taiwan-landlord-test.zeabur.app/api/sync/all');
  console.log('\n📱 前端測試:');
  console.log('https://taiwan-landlord-vietnam-tenant-syst.vercel.app');
  process.exit(0);
}).catch(error => {
  console.error('❌ 初始化過程出錯:', error);
  process.exit(1);
});