"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = require("../db/pool");
const websocket_1 = require("../services/websocket");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const result = await pool_1.pool.query('SELECT * FROM rooms ORDER BY id');
        res.json({ success: true, data: result.rows });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
router.post('/', async (req, res) => {
    const { property_id, floor, room_number, monthly_rent, deposit, status, tenant_name, check_in_date, check_out_date, current_meter, previous_meter } = req.body;
    try {
        const result = await pool_1.pool.query(`INSERT INTO rooms (property_id, floor, room_number, rent_amount, deposit_amount, status, tenant_name, check_in_date, check_out_date, current_meter, previous_meter) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [
            property_id,
            floor,
            room_number,
            monthly_rent || 0,
            deposit || 0,
            status || 'available',
            tenant_name || null,
            check_in_date || null,
            check_out_date || null,
            current_meter || 0,
            previous_meter || 0
        ]);
        (0, websocket_1.broadcast)('room:created', result.rows[0]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        console.error('Create room error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { floor, room_number, monthly_rent, deposit, status, tenant_name, check_in_date, check_out_date, current_meter, previous_meter } = req.body;
    try {
        const result = await pool_1.pool.query(`UPDATE rooms SET floor=$1, room_number=$2, rent_amount=$3, deposit_amount=$4, status=$5, tenant_name=$6, check_in_date=$7, check_out_date=$8, current_meter=$9, previous_meter=$10, updated_at=NOW() WHERE id=$11 RETURNING *`, [floor, room_number, monthly_rent, deposit, status, tenant_name || null, check_in_date || null, check_out_date || null, current_meter || 0, previous_meter || 0, id]);
        (0, websocket_1.broadcast)('room:updated', result.rows[0]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        console.error('Update room error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool_1.pool.query('DELETE FROM rooms WHERE id=$1', [id]);
        (0, websocket_1.broadcast)('room:deleted', { id });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
