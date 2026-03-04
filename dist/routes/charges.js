"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = require("../db/pool");
const websocket_1 = require("../services/websocket");
const router = (0, express_1.Router)();
/**
 * GET /api/charges/suggested
 * 計算所有租客的建議繳費項目
 *
 * 返回結構：
 * {
 *   success: true,
 *   data: {
 *     tenants: [
 *       {
 *         id: number,
 *         tenant_name: string,
 *         room_number: string,
 *         room_id: number,
 *         property_id: number,
 *         check_in_date: string,
 *         rent_amount: number,
 *         deposit_amount: number,
 *         deposit_status: string,
 *         suggested_charges: [
 *           {
 *             type: 'deposit' | 'rent' | 'electricity',
 *             amount: number,
 *             reason: string,
 *             due_date?: string,
 *             notes?: string,
 *             is_urgent: boolean
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * }
 */
router.get('/suggested', async (req, res) => {
    const client = await pool_1.pool.connect();
    try {
        // 1. 獲取所有活躍租客
        const tenantsResult = await client.query(`
      SELECT t.*, r.room_number, r.property_id, r.current_meter, r.previous_meter
      FROM tenants t
      LEFT JOIN rooms r ON t.room_id = r.id
      WHERE t.status = 'active'
      ORDER BY t.property_id, t.room_id
    `);
        const tenants = tenantsResult.rows;
        const suggestedCharges = [];
        // 2. 為每個租客計算建議繳費項目
        for (const tenant of tenants) {
            const charges = await calculateSuggestedCharges(client, tenant);
            if (charges.length > 0) {
                suggestedCharges.push({
                    id: tenant.id,
                    tenant_name: tenant.tenant_name,
                    room_number: tenant.room_number,
                    room_id: tenant.room_id,
                    property_id: tenant.property_id,
                    check_in_date: tenant.check_in_date,
                    rent_amount: tenant.rent_amount,
                    deposit_amount: tenant.deposit_amount,
                    deposit_status: tenant.deposit_status,
                    suggested_charges: charges
                });
            }
        }
        res.json({
            success: true,
            data: {
                tenants: suggestedCharges,
                summary: {
                    total_tenants: tenants.length,
                    tenants_with_charges: suggestedCharges.length,
                    total_suggested_amount: suggestedCharges.reduce((sum, tenant) => {
                        return sum + tenant.suggested_charges.reduce((chargeSum, charge) => chargeSum + charge.amount, 0);
                    }, 0)
                }
            }
        });
    }
    catch (err) {
        console.error('計算建議繳費項目失敗:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
    finally {
        client.release();
    }
});
/**
 * POST /api/charges/generate
 * 生成正式繳費記錄
 *
 * 請求體：
 * {
 *   tenant_id: number,
 *   charges: string[]  // ['deposit', 'rent', 'electricity']
 * }
 */
router.post('/generate', async (req, res) => {
    const { tenant_id, charges: chargeTypes } = req.body;
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        // 1. 驗證租客存在
        const tenantResult = await client.query('SELECT * FROM tenants WHERE id = $1 AND status = $2', [tenant_id, 'active']);
        if (tenantResult.rows.length === 0) {
            throw new Error('租客不存在或不是活躍狀態');
        }
        const tenant = tenantResult.rows[0];
        // 2. 獲取房間資訊
        const roomResult = await client.query('SELECT * FROM rooms WHERE id = $1', [tenant.room_id]);
        if (roomResult.rows.length === 0) {
            throw new Error('房間不存在');
        }
        const room = roomResult.rows[0];
        // 3. 計算建議項目
        const suggestedCharges = await calculateSuggestedCharges(client, tenant);
        // 4. 過濾出用戶選擇的項目
        const chargesToGenerate = suggestedCharges.filter(charge => chargeTypes.includes(charge.type));
        if (chargesToGenerate.length === 0) {
            throw new Error('沒有找到符合的建議繳費項目');
        }
        // 5. 生成正式繳費記錄
        const generatedPayments = [];
        const currentMonth = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const today = new Date().toISOString().split('T')[0];
        for (const charge of chargesToGenerate) {
            // 檢查是否已經有相同類型的未繳記錄
            const existingQuery = await client.query(`SELECT id FROM payments 
         WHERE tenant_id = $1 AND type = $2 AND status = 'pending' AND archived = FALSE`, [tenant_id, charge.type]);
            if (existingQuery.rows.length > 0) {
                console.log(`跳過 ${charge.type}，已有未繳記錄`);
                continue;
            }
            // 插入新記錄
            const paymentResult = await client.query(`INSERT INTO payments 
         (property_id, room_id, tenant_id, room_number, tenant_name, 
          month, type, rent_amount, total_amount, due_date, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`, [
                room.property_id,
                room.id,
                tenant.id,
                room.room_number,
                tenant.tenant_name,
                currentMonth,
                charge.type,
                charge.type === 'rent' ? charge.amount : null,
                charge.amount,
                charge.due_date || null,
                'pending',
                charge.notes || charge.reason
            ]);
            generatedPayments.push(paymentResult.rows[0]);
            // 如果是押金且狀態為已付，更新租客的押金狀態
            if (charge.type === 'deposit' && tenant.deposit_status === 'pending') {
                await client.query('UPDATE tenants SET deposit_status = $1 WHERE id = $2', ['paid', tenant.id]);
            }
        }
        // 提交事務
        await client.query('COMMIT');
        // 廣播更新
        (0, websocket_1.broadcast)('payments_updated', { tenant_id, payments: generatedPayments });
        res.json({
            success: true,
            data: {
                payments: generatedPayments,
                summary: {
                    generated_count: generatedPayments.length,
                    total_amount: generatedPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0)
                }
            },
            message: `成功生成 ${generatedPayments.length} 筆繳費記錄`
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('生成繳費記錄失敗:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
    finally {
        client.release();
    }
});
/**
 * 計算單個租客的建議繳費項目
 */
async function calculateSuggestedCharges(client, tenant) {
    const charges = [];
    const today = new Date();
    const checkInDate = new Date(tenant.check_in_date);
    // 1. 檢查押金
    if (tenant.deposit_status === 'pending') {
        charges.push({
            type: 'deposit',
            amount: tenant.deposit_amount,
            reason: '入住押金',
            due_date: tenant.check_in_date,
            notes: '根據入住時選擇的付款方式',
            is_urgent: true
        });
    }
    // 2. 檢查租金
    // 計算從入住月份到當前月份的所有月份
    const startMonth = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), 1);
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    let monthCursor = new Date(startMonth);
    while (monthCursor <= currentMonth) {
        const monthStr = `${monthCursor.getFullYear()}/${String(monthCursor.getMonth() + 1).padStart(2, '0')}`;
        // 檢查是否已經有這個月的租金記錄
        const existingRentQuery = await client.query(`SELECT id FROM payments 
       WHERE tenant_id = $1 AND type = 'rent' AND month = $2 AND archived = FALSE`, [tenant.id, monthStr]);
        if (existingRentQuery.rows.length === 0) {
            // 計算租金金額（如果是月中入住，按比例計算）
            let rentAmount = tenant.rent_amount;
            if (monthCursor.getTime() === startMonth.getTime() && checkInDate.getDate() > 1) {
                // 月中入住，按天數比例計算
                const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
                const daysRemaining = daysInMonth - checkInDate.getDate() + 1;
                rentAmount = Math.round(tenant.rent_amount * (daysRemaining / daysInMonth));
            }
            // 計算繳費截止日（通常為下個月5號）
            const dueDate = new Date(monthCursor);
            dueDate.setMonth(dueDate.getMonth() + 1);
            dueDate.setDate(5);
            charges.push({
                type: 'rent',
                amount: rentAmount,
                reason: `${monthStr} 租金`,
                due_date: dueDate.toISOString().split('T')[0],
                notes: monthCursor.getTime() === startMonth.getTime() && checkInDate.getDate() > 1
                    ? `按比例計算（${checkInDate.getDate()}日入住）`
                    : '月租金',
                is_urgent: dueDate < today // 如果已過期，標記為緊急
            });
        }
        // 移到下個月
        monthCursor.setMonth(monthCursor.getMonth() + 1);
    }
    // 3. 檢查電費（如果有電錶讀數）
    if (tenant.current_meter && tenant.previous_meter) {
        const usage = tenant.current_meter - tenant.previous_meter;
        if (usage > 0) {
            const electricityRate = 6; // 預設電費單價
            const electricityFee = usage * electricityRate;
            charges.push({
                type: 'electricity',
                amount: electricityFee,
                reason: '電費',
                notes: `用電 ${usage} 度 × ${electricityRate} 元/度`,
                is_urgent: false
            });
        }
    }
    return charges;
}
/**
 * GET /api/charges/summary
 * 取得繳費統計摘要
 */
router.get('/summary', async (req, res) => {
    try {
        const [tenantsResult, paymentsResult] = await Promise.all([
            pool_1.pool.query("SELECT COUNT(*) as count, SUM(rent_amount) as total_rent, SUM(deposit_amount) as total_deposit FROM tenants WHERE status = 'active'"),
            pool_1.pool.query("SELECT COUNT(*) as count, SUM(total_amount) as total_amount FROM payments WHERE status = 'pending' AND archived = FALSE")
        ]);
        const tenants = tenantsResult.rows[0];
        const pendingPayments = paymentsResult.rows[0];
        res.json({
            success: true,
            data: {
                active_tenants: parseInt(tenants.count) || 0,
                total_monthly_rent: parseInt(tenants.total_rent) || 0,
                total_deposit: parseInt(tenants.total_deposit) || 0,
                pending_payments: parseInt(pendingPayments.count) || 0,
                pending_amount: parseInt(pendingPayments.total_amount) || 0
            }
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
exports.default = router;
