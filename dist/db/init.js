"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
const pool_1 = require("./pool");
async function initDatabase() {
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        // 物業表
        await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address TEXT,
        owner_name VARCHAR(100),
        owner_phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
        // 房間表（只存當前狀態）
        await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        floor INTEGER DEFAULT 1,
        room_number VARCHAR(20) NOT NULL,
        rent_amount INTEGER DEFAULT 0,
        deposit_amount INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'available',
        tenant_name VARCHAR(100),
        tenant_phone VARCHAR(20),
        check_in_date DATE,
        check_out_date DATE,
        current_meter DECIMAL DEFAULT 0,
        previous_meter DECIMAL DEFAULT 0,
        current_tenant_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
        // 租約表（每次出租/續租一筆）
        await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        room_number VARCHAR(20),
        tenant_name VARCHAR(100) NOT NULL,
        tenant_phone VARCHAR(20),
        check_in_date DATE,
        check_out_date DATE,
        rent_amount INTEGER DEFAULT 0,
        deposit_amount INTEGER DEFAULT 0,
        deposit_status VARCHAR(20) DEFAULT 'pending',
        deposit_carried_over BOOLEAN DEFAULT FALSE,
        previous_tenant_id INTEGER,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
        // 繳費記錄表
        await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        room_number VARCHAR(20),
        tenant_name VARCHAR(100),
        month VARCHAR(10),
        type VARCHAR(20) DEFAULT 'rent',
        rent_amount INTEGER DEFAULT 0,
        electricity_usage DECIMAL DEFAULT 0,
        electricity_fee DECIMAL DEFAULT 0,
        electricity_rate DECIMAL DEFAULT 6,
        total_amount INTEGER DEFAULT 0,
        due_date DATE,
        paid_date DATE,
        status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(20) DEFAULT 'cash',
        notes TEXT,
        is_backfill BOOLEAN DEFAULT FALSE,
        archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
        // 成本支出表
        await client.query(`
      CREATE TABLE IF NOT EXISTS costs (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        date DATE,
        category VARCHAR(50),
        sub_category VARCHAR(50),
        amount INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
        await client.query('COMMIT');
        console.log('✅ 資料庫初始化完成');
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('資料庫初始化失敗:', err);
        throw err;
    }
    finally {
        client.release();
    }
}
