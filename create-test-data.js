// 創建測試數據腳本
const { Pool } = require('pg');

console.log('📝 創建測試數據...');
console.log('時間:', new Date().toISOString());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/taiwan_landlord_test',
  ssl: false,
});

async function createTestData() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 連接資料庫...');
    
    // 1. 創建測試房間
    console.log('1. 檢查並創建測試房間...');
    const roomsCheck = await client.query('SELECT COUNT(*) as count FROM rooms');
    const roomCount = parseInt(roomsCheck.rows[0].count);
    
    if (roomCount === 0) {
      console.log('   創建3個測試房間...');
      await client.query(`
        INSERT INTO rooms (property_id, floor, room_number, status, rent_amount, deposit_amount, tenant_name, tenant_phone) 
        VALUES 
        (1, 1, '101', 'available', 8000, 16000, NULL, NULL),
        (1, 1, '102', 'occupied', 8500, 17000, '張小明', '0912-345-678'),
        (1, 2, '201', 'available', 9000, 18000, NULL, NULL),
        (1, 2, '202', 'maintenance', 0, 0, NULL, NULL)
      `);
      console.log('   ✅ 4個測試房間已創建');
    } else {
      console.log(`   ✅ 已有 ${roomCount} 個房間`);
    }
    
    // 2. 創建測試付款
    console.log('2. 檢查並創建測試付款記錄...');
    const paymentsCheck = await client.query('SELECT COUNT(*) as count FROM payments');
    const paymentCount = parseInt(paymentsCheck.rows[0].count);
    
    if (paymentCount === 0) {
      console.log('   創建測試付款記錄...');
      await client.query(`
        INSERT INTO payments (room_id, month, rent_amount, electricity_usage, electricity_fee, total_amount, status, due_date) 
        VALUES 
        (2, '2024-01', 8500, 120, 600, 9100, 'paid', '2024-02-05'),
        (2, '2024-02', 8500, 135, 675, 9175, 'pending', '2024-03-05'),
        (2, '2024-03', 8500, 110, 550, 9050, 'pending', '2024-04-05')
      `);
      console.log('   ✅ 3個測試付款記錄已創建');
    } else {
      console.log(`   ✅ 已有 ${paymentCount} 個付款記錄`);
    }
    
    // 3. 創建測試租客
    console.log('3. 檢查並創建測試租客...');
    const tenantsCheck = await client.query('SELECT COUNT(*) as count FROM tenants');
    const tenantCount = parseInt(tenantsCheck.rows[0].count);
    
    if (tenantCount === 0) {
      console.log('   創建測試租客...');
      await client.query(`
        INSERT INTO tenants (name, phone, room_id, status, check_in_date) 
        VALUES 
        ('張小明', '0912-345-678', 2, 'active', '2024-01-15'),
        ('李大同', '0933-987-654', NULL, 'inactive', '2023-12-01'),
        ('王美麗', '0922-111-222', NULL, 'active', '2024-02-01')
      `);
      console.log('   ✅ 3個測試租客已創建');
    } else {
      console.log(`   ✅ 已有 ${tenantCount} 個租客`);
    }
    
    // 4. 創建測試維護記錄
    console.log('4. 檢查並創建測試維護記錄...');
    const maintenanceCheck = await client.query('SELECT COUNT(*) as count FROM maintenance');
    const maintenanceCount = parseInt(maintenanceCheck.rows[0].count);
    
    if (maintenanceCount === 0) {
      console.log('   創建測試維護記錄...');
      await client.query(`
        INSERT INTO maintenance (room_id, title, description, urgency, status, report_date, cost) 
        VALUES 
        (4, '浴室漏水', '浴室水管漏水需要修理', 'high', 'pending', '2024-03-01', 3000),
        (2, '燈泡更換', '房間燈泡損壞', 'normal', 'completed', '2024-02-15', 200),
        (1, '門鎖修理', '門鎖卡住無法開啟', 'high', 'in_progress', '2024-03-01', 1500)
      `);
      console.log('   ✅ 3個測試維護記錄已創建');
    } else {
      console.log(`   ✅ 已有 ${maintenanceCount} 個維護記錄`);
    }
    
    // 5. 創建測試歷史記錄
    console.log('5. 檢查並創建測試歷史記錄...');
    const historyCheck = await client.query('SELECT COUNT(*) as count FROM history');
    const historyCount = parseInt(historyCheck.rows[0].count);
    
    if (historyCount === 0) {
      console.log('   創建測試歷史記錄...');
      await client.query(`
        INSERT INTO history (room_id, tenant_name, month, rent_amount, electricity_usage, electricity_fee, total_amount, status) 
        VALUES 
        (2, '張小明', '2023-12', 8500, 115, 575, 9075, 'paid'),
        (2, '張小明', '2024-01', 8500, 120, 600, 9100, 'paid'),
        (NULL, '李大同', '2023-11', 8000, 105, 525, 8525, 'paid')
      `);
      console.log('   ✅ 3個測試歷史記錄已創建');
    } else {
      console.log(`   ✅ 已有 ${historyCount} 個歷史記錄`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 測試數據創建完成！');
    console.log('='.repeat(60));
    console.log('📊 數據統計:');
    console.log(`   房間: ${roomCount === 0 ? '4 (新創建)' : roomCount + ' (已有)'}`);
    console.log(`   付款: ${paymentCount === 0 ? '3 (新創建)' : paymentCount + ' (已有)'}`);
    console.log(`   租客: ${tenantCount === 0 ? '3 (新創建)' : tenantCount + ' (已有)'}`);
    console.log(`   維護: ${maintenanceCount === 0 ? '3 (新創建)' : maintenanceCount + ' (已有)'}`);
    console.log(`   歷史: ${historyCount === 0 ? '3 (新創建)' : historyCount + ' (已有)'}`);
    console.log('');
    console.log('🚀 現在前端應該不會有空陣列錯誤了！');
    console.log('   清除瀏覽器緩存並重新測試');
    
  } catch (error) {
    console.error('❌ 創建測試數據失敗:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// 執行
createTestData();