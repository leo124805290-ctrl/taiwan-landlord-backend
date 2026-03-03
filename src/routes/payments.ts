import { Router } from 'express';
import { pool } from '../db/pool';
import { broadcast } from '../services/websocket';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { property_id, room_id, tenant_id, status, type, is_backfill } = req.query;
    let query = 'SELECT * FROM payments WHERE 1=1';
    const params: any[] = [];

    if (property_id) {
      params.push(property_id);
      query += ` AND property_id = $${params.length}`;
    }
    if (room_id) {
      params.push(room_id);
      query += ` AND room_id = $${params.length}`;
    }
    if (tenant_id) {
      params.push(tenant_id);
      query += ` AND tenant_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }
    if (is_backfill !== undefined) {
      params.push(is_backfill === 'true');
      query += ` AND is_backfill = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { property_id, room_id, tenant_id, room_number, tenant_name, month, type, rent_amount, electricity_usage, electricity_fee, electricity_rate, total_amount, due_date, paid_date, status, payment_method, notes, is_backfill } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO payments (property_id, room_id, tenant_id, room_number, tenant_name, month, type, rent_amount, electricity_usage, electricity_fee, electricity_rate, total_amount, due_date, paid_date, status, payment_method, notes, is_backfill) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [property_id, room_id, tenant_id || null, room_number, tenant_name, month, type || 'rent', rent_amount || 0, electricity_usage || 0, electricity_fee || 0, electricity_rate || 6, total_amount || 0, due_date || null, paid_date || null, status || 'pending', payment_method || 'cash', notes || null, is_backfill || false]
    );
    broadcast('payment:created', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, paid_date, payment_method, notes, rent_amount, electricity_usage, electricity_fee, total_amount, electricity_rate } = req.body;
  try {
    const result = await pool.query(
      `UPDATE payments SET status=COALESCE($1,status), paid_date=COALESCE($2,paid_date), payment_method=COALESCE($3,payment_method), notes=COALESCE($4,notes), rent_amount=COALESCE($5,rent_amount), electricity_usage=COALESCE($6,electricity_usage), electricity_fee=COALESCE($7,electricity_fee), total_amount=COALESCE($8,total_amount), electricity_rate=COALESCE($9,electricity_rate), updated_at=NOW() WHERE id=$10 RETURNING *`,
      [status||null, paid_date||null, payment_method||null, notes||null, rent_amount||null, electricity_usage||null, electricity_fee||null, total_amount||null, electricity_rate||null, id]
    );
    broadcast('payment:updated', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM payments WHERE id=$1', [id]);
    broadcast('payment:deleted', { id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;