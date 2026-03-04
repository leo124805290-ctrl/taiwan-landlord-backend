"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
// POST /api/checkin/complete - 原子性入住操作
router.post('/complete', async (req, res) => {
    const client = await pool_1.pool.connect();
    try {
        const { room_id, tenant, payment_option } = req.body;
        // 基本驗證
        if (!room_id) {
            return res.status(400).json({
                success: false,
                error: '房間ID為必填'
            });
        }
        if (!tenant || !tenant.tenant_name) {
            return res.status(400).json({
                success: false,
                error: '租客姓名為必填'
            });
        }
        if (!tenant.check_in_date) {
            return res.status(400).json({
                success: false,
                error: '起租日期為必填'
            });
        }
        if (!['full', 'deposit_only', 'reservation_only'].includes(payment_option)) {
            return res.status(400).json({
                success: false,
                error: '付款方式必須為 full、deposit_only 或 reservation_only'
            });
        }
        // 開始事務
        await client.query('BEGIN');
        try {
            // 1. 驗證房間可用性（空房狀態是 'available'）
            const roomResult = await client.query(`SELECT * FROM rooms WHERE id = $1 AND status = 'available' FOR UPDATE`, [room_id]);
            if (roomResult.rows.length === 0) {
                throw new Error('房間不存在或不可用（非空房狀態）');
            }
            const room = roomResult.rows[0];
            // 2. 建立租客記錄
            const depositStatus = payment_option === 'full' || payment_option === 'deposit_only' ? 'paid' : 'pending';
            const tenantResult = await client.query(`INSERT INTO tenants 
         (property_id, room_id, tenant_name, tenant_phone, check_in_date, check_out_date, 
          rent_amount, deposit_amount, deposit_status, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`, [
                room.property_id,
                room_id,
                tenant.tenant_name,
                tenant.tenant_phone || null,
                tenant.check_in_date,
                tenant.check_out_date || null,
                room.rent_amount,
                room.deposit_amount,
                depositStatus,
                'active'
            ]);
            const newTenant = tenantResult.rows[0];
            // 3. 更新房間狀態（補上 tenant_phone 和 check_out_date）
            const roomStatus = getRoomStatusByPaymentOption(payment_option);
            await client.query(`UPDATE rooms 
         SET status = $1, current_tenant_id = $2, tenant_name = $3, 
             tenant_phone = $4, check_in_date = $5, check_out_date = $6
         WHERE id = $7`, [
                roomStatus,
                newTenant.id,
                newTenant.tenant_name,
                newTenant.tenant_phone,
                newTenant.check_in_date,
                newTenant.check_out_date,
                room_id
            ]);
            // 4. 建立付款記錄（使用 total_amount 和 rent_amount）
            const payments = await createPaymentRecords(client, {
                tenant_id: newTenant.id,
                room_id: room_id,
                property_id: room.property_id,
                payment_option: payment_option,
                rent_amount: room.rent_amount,
                deposit_amount: room.deposit_amount,
                check_in_date: newTenant.check_in_date
            });
            // 提交事務
            await client.query('COMMIT');
            // 返回成功回應
            res.status(201).json({
                success: true,
                data: {
                    tenant: newTenant,
                    room: { ...room, status: roomStatus },
                    payments
                },
                message: '入住成功'
            });
        }
        catch (error) {
            // 回滾事務
            await client.query('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
    finally {
        // 釋放連接
        client.release();
    }
});
// 輔助函數
function getRoomStatusByPaymentOption(paymentOption) {
    const statusMap = {
        'full': 'occupied',
        'deposit_only': 'occupied',
        'reservation_only': 'pending_checkin_unpaid'
    };
    return statusMap[paymentOption] || 'occupied';
}
async function createPaymentRecords(client, params) {
    const { payment_option, rent_amount, deposit_amount, check_in_date } = params;
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const payments = [];
    if (payment_option === 'full') {
        // 押金已收款
        payments.push({
            type: 'deposit',
            total_amount: deposit_amount,
            rent_amount: null,
            status: 'paid',
            paid_date: today,
            notes: '入住押金'
        });
        // 首月租金已收款
        payments.push({
            type: 'rent',
            total_amount: rent_amount,
            rent_amount: rent_amount,
            status: 'paid',
            paid_date: today,
            notes: '入住首月租金'
        });
    }
    else if (payment_option === 'deposit_only') {
        // 押金已收款
        payments.push({
            type: 'deposit',
            total_amount: deposit_amount,
            rent_amount: null,
            status: 'paid',
            paid_date: today,
            notes: '入住押金'
        });
        // 首月租金待繳
        payments.push({
            type: 'rent',
            total_amount: rent_amount,
            rent_amount: rent_amount,
            status: 'pending',
            due_date: check_in_date,
            notes: '入住首月租金待繳'
        });
    }
    else { // reservation_only
        // 押金待繳
        payments.push({
            type: 'deposit',
            total_amount: deposit_amount,
            rent_amount: null,
            status: 'pending',
            due_date: check_in_date,
            notes: '押金待繳'
        });
        // 首月租金待繳
        payments.push({
            type: 'rent',
            total_amount: rent_amount,
            rent_amount: rent_amount,
            status: 'pending',
            due_date: check_in_date,
            notes: '首月租金待繳'
        });
    }
    // 實際插入資料庫
    const createdPayments = [];
    for (const payment of payments) {
        const result = await client.query(`INSERT INTO payments 
       (property_id, room_id, tenant_id, type, month, total_amount, rent_amount, status, due_date, paid_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`, [
            params.property_id,
            params.room_id,
            params.tenant_id,
            payment.type,
            currentMonth,
            payment.total_amount,
            payment.rent_amount,
            payment.status,
            payment.due_date || null,
            payment.paid_date || null,
            payment.notes
        ]);
        createdPayments.push(result.rows[0]);
    }
    return createdPayments;
}
exports.default = router;
