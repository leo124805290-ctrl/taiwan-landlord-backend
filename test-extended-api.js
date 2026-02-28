#!/usr/bin/env node

/**
 * 測試擴展後的簡單API
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_URL = 'http://localhost:3001/api';

async function testAPI() {
  console.log('🧪 測試擴展後的簡單API...\n');
  
  try {
    // 1. 測試健康檢查
    console.log('1. 測試健康檢查...');
    const healthRes = await fetch('http://localhost:3001/health');
    const healthData = await healthRes.json();
    console.log(`   ✅ 健康檢查: ${healthData.status}`);
    
    // 2. 測試API文檔
    console.log('\n2. 測試API文檔...');
    const docsRes = await fetch('http://localhost:3001/api-docs');
    const docsData = await docsRes.json();
    console.log(`   ✅ API文檔: ${docsData.name} v${docsData.version}`);
    
    // 3. 測試房間API
    console.log('\n3. 測試房間API...');
    
    // 3.1 創建房間
    const createRoomRes = await fetch(`${API_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: 1,
        name: '測試房間101',
        floor: 1,
        room_number: '101',
        status: 'available',
        monthly_rent: 8000,
        deposit: 16000
      })
    });
    const createRoomData = await createRoomRes.json();
    console.log(`   ✅ 創建房間: ${createRoomData.message}`);
    
    const roomId = createRoomData.data.room.id;
    
    // 3.2 獲取房間列表
    const roomsRes = await fetch(`${API_URL}/rooms`);
    const roomsData = await roomsRes.json();
    console.log(`   ✅ 獲取房間列表: ${roomsData.data.count} 個房間`);
    
    // 3.3 更新房間狀態
    const updateStatusRes = await fetch(`${API_URL}/rooms/${roomId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'occupied',
        tenant_name: '測試租客',
        check_in_date: '2026-02-28',
        rent: 8000,
        deposit: 16000
      })
    });
    const updateStatusData = await updateStatusRes.json();
    console.log(`   ✅ 更新房間狀態: ${updateStatusData.message}`);
    
    // 4. 測試付款API
    console.log('\n4. 測試付款API...');
    
    // 4.1 創建付款記錄
    const createPaymentRes = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        month: '2026/02',
        payment_type: 'rent',
        total_amount: 8000,
        status: 'pending'
      })
    });
    const createPaymentData = await createPaymentRes.json();
    console.log(`   ✅ 創建付款記錄: ${createPaymentData.message}`);
    
    const paymentId = createPaymentData.data.payment.id;
    
    // 4.2 標記付款為已支付
    const markPaidRes = await fetch(`${API_URL}/payments/${paymentId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_method: 'cash',
        payment_date: '2026-02-28',
        notes: '測試付款'
      })
    });
    const markPaidData = await markPaidRes.json();
    console.log(`   ✅ 標記付款為已支付: ${markPaidData.message}`);
    
    // 5. 測試租客API
    console.log('\n5. 測試租客API...');
    
    // 5.1 創建租客
    const createTenantRes = await fetch(`${API_URL}/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '測試租客',
        phone: '0912345678',
        room_id: roomId,
        property_id: 1,
        id_number: 'A123456789',
        emergency_contact: '0987654321'
      })
    });
    const createTenantData = await createTenantRes.json();
    console.log(`   ✅ 創建租客: ${createTenantData.message}`);
    
    // 6. 測試同步API
    console.log('\n6. 測試同步API...');
    
    // 6.1 檢查同步狀態
    const syncStatusRes = await fetch(`${API_URL}/sync/status`);
    const syncStatusData = await syncStatusRes.json();
    console.log(`   ✅ 同步狀態: ${syncStatusData.data.rooms.total} 房間, ${syncStatusData.data.payments.total} 付款, ${syncStatusData.data.tenants.total} 租客`);
    
    // 6.2 測試批量同步
    const batchSyncRes = await fetch(`${API_URL}/sync/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: [
          {
            type: 'create_room',
            data: {
              property_id: 1,
              name: '批量創建房間102',
              floor: 1,
              room_number: '102',
              status: 'available',
              monthly_rent: 7500,
              deposit: 15000
            }
          },
          {
            type: 'create_payment',
            data: {
              room_id: roomId,
              month: '2026/03',
              payment_type: 'rent',
              total_amount: 8000,
              status: 'pending'
            }
          }
        ]
      })
    });
    const batchSyncData = await batchSyncRes.json();
    console.log(`   ✅ 批量同步: ${batchSyncData.data.successful} 成功, ${batchSyncData.data.failed} 失敗`);
    
    // 7. 測試數據獲取
    console.log('\n7. 測試數據獲取...');
    
    // 7.1 獲取所有數據
    const allDataRes = await fetch(`${API_URL}/sync/all`);
    const allData = await allDataRes.json();
    console.log(`   ✅ 獲取所有數據: ${allData.data.rooms.length} 房間, ${allData.data.payments.length} 付款, ${allData.data.tenants.length} 租客`);
    
    console.log('\n🎉 所有API測試完成！');
    console.log('\n📊 測試總結:');
    console.log(`   - 房間管理: ✅ 創建、列表、狀態更新`);
    console.log(`   - 付款管理: ✅ 創建、標記支付`);
    console.log(`   - 租客管理: ✅ 創建`);
    console.log(`   - 數據同步: ✅ 狀態檢查、批量操作`);
    console.log(`   - 數據獲取: ✅ 所有數據`);
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.log('\n💡 提示: 請先啟動後端伺服器:');
    console.log('   cd taiwan-landlord-backend');
    console.log('   node simple-api.js');
  }
}

// 執行測試
testAPI();