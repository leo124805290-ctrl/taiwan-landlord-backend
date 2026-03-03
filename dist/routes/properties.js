"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = require("../db/pool");
const websocket_1 = require("../services/websocket");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const result = await pool_1.pool.query('SELECT * FROM properties ORDER BY id DESC');
        res.json({ success: true, data: result.rows });
    }
    catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
router.post('/', async (req, res) => {
    const { name, address, owner_name, owner_phone } = req.body;
    try {
        const result = await pool_1.pool.query('INSERT INTO properties (name, address, owner_name, owner_phone) VALUES ($1,$2,$3,$4) RETURNING *', [name, address, owner_name, owner_phone]);
        (0, websocket_1.broadcast)('property:created', result.rows[0]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, address, owner_name, owner_phone } = req.body;
    try {
        const result = await pool_1.pool.query('UPDATE properties SET name=$1, address=$2, owner_name=$3, owner_phone=$4, updated_at=NOW() WHERE id=$5 RETURNING *', [name, address, owner_name, owner_phone, id]);
        (0, websocket_1.broadcast)('property:updated', result.rows[0]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool_1.pool.query('DELETE FROM properties WHERE id=$1', [id]);
        (0, websocket_1.broadcast)('property:deleted', { id });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
exports.default = router;
