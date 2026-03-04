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
            // 4. 不生成繳費記錄（新邏輯：即時計算 + 延遲生成）
            // 只記錄租客和房間狀態，繳費記錄由用戶手動生成
            // 提交事務
            await client.query('COMMIT');
            // 返回成功回應
            res.status(201).json({
                success: true,
                data: {
                    tenant: newTenant,
                    room: { ...room, status: roomStatus }
                },
                message: '✅ 入住成功！請到繳費分頁查看建議繳費項目。'
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
exports.default = router;
