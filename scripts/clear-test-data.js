const { pool } = require('../dist/db/pool');

async function clearTestData() {
  const client = await pool.connect();
  
  try {
    console.log('開始清除測試資料...');
    
    // 開始事務
    await client.query('BEGIN');
    
    // 1. 刪除所有繳費記錄
    console.log('刪除繳費記錄...');
    const paymentsResult = await client.query('DELETE FROM payments RETURNING id');
    console.log(`已刪除 ${paymentsResult.rowCount} 筆繳費記錄`);
    
    // 2. 刪除所有租客記錄
    console.log('刪除租客記錄...');
    const tenantsResult = await client.query('DELETE FROM tenants RETURNING id');
    console.log(`已刪除 ${tenantsResult.rowCount} 筆租客記錄`);
    
    // 3. 重置所有房間狀態為空房
    console.log('重置房間狀態...');
    const roomsResult = await client.query(`
      UPDATE rooms 
      SET status = 'available', 
          current_tenant_id = NULL,
          tenant_name = NULL,
          tenant_phone = NULL,
          check_in_date = NULL,
          check_out_date = NULL
      RETURNING id
    `);
    console.log(`已重置 ${roomsResult.rowCount} 間房間狀態`);
    
    // 提交事務
    await client.query('COMMIT');
    
    console.log('✅ 測試資料清除完成！');
    console.log(`總計: ${paymentsResult.rowCount} 筆繳費 + ${tenantsResult.rowCount} 筆租客 + ${roomsResult.rowCount} 間房間`);
    
  } catch (error) {
    // 回滾事務
    await client.query('ROLLBACK');
    console.error('❌ 清除資料失敗:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// 執行清除
clearTestData().catch(console.error);