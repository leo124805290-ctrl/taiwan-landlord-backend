import { Router } from 'express';
import { pool } from '../db/pool';
import { broadcast } from '../services/websocket';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { property_id, room_id, status } = req.query;
    let query = 'SELECT * FROM tenants WHERE 1=1';
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      query += ` AND property_id = $${params.length}`;
    }
    if (room_id) {
      params.push(room_id);
      query += ` AND room_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { property_id, room_id, room_number, tenant_name, tenant_phone, check_in_date, check_out_date, rent_amount, deposit_amount, deposit_status, deposit_carried_over, previous_tenant_id, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tenants (property_id, room_id, room_number, tenant_name, tenant_phone, check_in_date, check_out_date, rent_amount, deposit_amount, deposit_status, deposit_carried_over, previous_tenant_id, notes, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active') RETURNING *`,
      [property_id, room_id, room_number, tenant_name, tenant_phone || null, check_in_date || null, check_out_date || null, rent_amount || 0, deposit_amount || 0, deposit_status || 'pending', deposit_carried_over || false, previous_tenant_id || null, notes || null]
    );
    broadcast('tenant:created', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  try {
    const keys = Object.keys(fields).filter(k => fields[k] !== undefined);
    const values = keys.map(k => fields[k]);
    const setClause = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
    values.push(id);
    const result = await pool.query(
      `UPDATE tenants SET ${setClause}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`,
      values
    );
    broadcast('tenant:updated', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;