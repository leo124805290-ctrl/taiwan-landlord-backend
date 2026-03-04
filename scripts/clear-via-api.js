const https = require('https');

const API_URL = 'https://taiwan-landlord-test.zeabur.app/api';

// 先獲取所有資料
function getAllData() {
  return new Promise((resolve, reject) => {
    https.get(`${API_URL}/sync/all`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 刪除租客
function deleteTenant(tenantId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'taiwan-landlord-test.zeabur.app',
      port: 443,
      path: `/api/tenants/${tenantId}`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    
    req.on('error', reject);
    req.end();
  });
}

// 刪除繳費記錄
function deletePayment(paymentId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'taiwan-landlord-test.zeabur.app',
      port: 443,
      path: `/api/payments/${paymentId}`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    
    req.on('error', reject);
    req.end();
  });
}

// 更新房間狀態為空房
function resetRoom(roomId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'taiwan-landlord-test.zeabur.app',
      port: 443,
      path: `/api/rooms/${roomId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    
    req.on('error', reject);
    req.write(JSON.stringify({
      status: 'available',
      current_tenant_id: null,
      tenant_name: null,
      tenant_phone: null,
      check_in_date: null,
      check_out_date: null
    }));
    req.end();
  });
}

async function clearData() {
  try {
    console.log('獲取現有資料...');
    const data = await getAllData();
    
    if (!data.success) {
      throw new Error('獲取資料失敗');
    }
    
    const properties = data.data.properties;
    console.log(`找到 ${properties.length} 個物業`);
    
    let totalPayments = 0;
    let totalTenants = 0;
    let totalRooms = 0;
    
    // 處理每個物業
    for (const prop of properties) {
      console.log(`\n處理物業: ${prop.name} (ID: ${prop.id})`);
      
      // 處理每個房間
      for (const room of prop.rooms) {
        console.log(`  房間 ${room.n} (ID: ${room.id}):`);
        
        // 刪除繳費記錄
        const allPayments = [...room.payments, ...room.history];
        for (const payment of allPayments) {
          console.log(`    刪除繳費記錄 ${payment.id}...`);
          await deletePayment(payment.id);
          totalPayments++;
        }
        
        // 如果有租客，刪除租客記錄
        if (room.current_tenant_id) {
          console.log(`    刪除租客 ${room.current_tenant_id}...`);
          await deleteTenant(room.current_tenant_id);
          totalTenants++;
        }
        
        // 重置房間狀態
        console.log(`    重置房間狀態...`);
        await resetRoom(room.id);
        totalRooms++;
      }
    }
    
    console.log('\n✅ 資料清除完成！');
    console.log(`總計: ${totalPayments} 筆繳費 + ${totalTenants} 筆租客 + ${totalRooms} 間房間`);
    
  } catch (error) {
    console.error('❌ 清除資料失敗:', error.message);
  }
}

// 執行清除
clearData();