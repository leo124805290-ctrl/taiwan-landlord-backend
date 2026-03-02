"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = require("../db/pool");
const websocket_1 = require("../services/websocket");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    const { property_id, floor, room_number, monthly_rent, deposit, status, tenant_name, check_in_date, check_out_date, current_meter, previous_meter } = req.body;
    try {
        const result = await pool_1.pool.query(`INSERT INTO rooms (property_id, floor, room_number, monthly_rent, deposit, status, tenant_name, check_in_date, check_out_date, current_meter, previous_meter) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [property_id, floor, room_number, monthly_rent, deposit, status, tenant_name, check_in_date, check_out_date, current_meter, previous_meter]);
        (0, websocket_1.broadcast)('room:created', result.rows[0]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { floor, room_number, monthly_rent, deposit, status, tenant_name, check_in_date, check_out_date, current_meter, previous_meter } = req.body;
    try {
        const result = await pool_1.pool.query(`UPDATE rooms SET floor=$1, room_number=$2, monthly_rent=$3, deposit=$4, status=$5, tenant_name=$6, check_in_date=$7, check_out_date=$8, current_meter=$9, previous_meter=$10, updated_at=NOW() WHERE id=$11 RETURNING *`, [floor, room_number, monthly_rent, deposit, status, tenant_name, check_in_date, check_out_date, current_meter, previous_meter, id]);
        (0, websocket_1.broadcast)('room:updated', result.rows[0]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
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
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
exports.default = router;
