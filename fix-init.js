// 修復 simple-api-fixed.js 中的初始化邏輯
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'simple-api-fixed.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 修復資料表初始化邏輯...');

// 找到初始化函數並替換
const oldInitFunction = `async function initializeDatabaseTables(client) {
  try {
    // 檢查表是否存在
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const existingTables = tables.rows.map(row => row.table_name);
    console.log('📊 現有資料表:', existingTables);
    
    // 檢查並創建缺失的表
    const requiredTables = ['properties', 'rooms', 'payments', 'tenants', 'maintenance', 'history'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('🛠️  創建缺失的資料表:', missingTables);`;

const newInitFunction = `async function initializeDatabaseTables(client) {
  try {
    // 檢查表是否存在
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const existingTables = tables.rows.map(row => row.table_name);
    console.log('📊 現有資料表:', existingTables);
    
    // 檢查並創建缺失的表
    const requiredTables = ['properties', 'rooms', 'payments', 'tenants', 'maintenance', 'history'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('🛠️  創建缺失的資料表:', missingTables);
      
      // 只創建缺失的表，使用 CREATE TABLE IF NOT EXISTS 確保安全
      for (const table of missingTables) {
        console.log(\`   創建 \${table} 表...\`);
        
        if (table === 'properties' && !existingTables.includes('properties')) {
          await client.query(\`
            CREATE TABLE IF NOT EXISTS properties (
              id SERIAL PRIMARY KEY,
              name VARCHAR(100) NOT NULL,
              address TEXT,
              floors INTEGER DEFAULT 1,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            )
          \`);
        }
        
        if (table === 'rooms' && !existingTables.includes('rooms')) {
          await client.query(\`
            CREATE TABLE IF NOT EXISTS rooms (
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
          \`);
        }
        
        if (table === 'payments' && !existingTables.includes('payments')) {
          await client.query(\`
            CREATE TABLE IF NOT EXISTS payments (
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
          \`);
        }
        
        if (table === 'tenants' && !existingTables.includes('tenants')) {
          await client.query(\`
            CREATE TABLE IF NOT EXISTS tenants (
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
          \`);
        }
        
        if (table === 'maintenance' && !existingTables.includes('maintenance')) {
          await client.query(\`
            CREATE TABLE IF NOT EXISTS maintenance (
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
          \`);
        }
        
        if (table === 'history' && !existingTables.includes('history')) {
          await client.query(\`
            CREATE TABLE IF NOT EXISTS history (
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
          \`);
        }
      }
      
      console.log('✅ 缺失的資料表創建完成');
    } else {
      console.log('✅ 所有必要資料表已存在');
    }`;

// 替換內容
if (content.includes(oldInitFunction)) {
  content = content.replace(oldInitFunction, newInitFunction);
  fs.writeFileSync(filePath, content);
  console.log('✅ 初始化邏輯修復完成');
  
  // 提交更改
  const { execSync } = require('child_process');
  execSync('git add simple-api-fixed.js', { stdio: 'inherit' });
  execSync('git commit -m "fix: 修復資料表初始化邏輯，確保創建所有必要表"', { stdio: 'inherit' });
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('\n🚀 代碼已提交並推送');
  console.log('📋 下一步: 在 Zeabur 重新部署');
} else {
  console.log('❌ 找不到要替換的內容，可能已經修復過');
}