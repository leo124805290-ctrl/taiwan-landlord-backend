import { Router } from 'express';
import { pool } from '../db/pool';
import { broadcast } from '../services/websocket';

const router = Router();

router.post('/', async (req, res) => {
  const { room_id, property_id, amount, type, payment_date, due_date, status, archived } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO payments (room_id, property_id, amount, type, payment_date, due_date, status, archived) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [room_id, property_id, amount, type, payment_date, due_date, status || 'paid', archived || false]
    );
    broadcast('payment:created', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { amount, type, payment_date, due_date, status, archived } = req.body;
  try {
    const result = await pool.query(
      `UPDATE payments SET amount=$1, type=$2, payment_date=$3, due_date=$4, status=$5, archived=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [amount, type, payment_date, due_date, status, archived, id]
    );
    broadcast('payment:updated', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM payments WHERE id=$1', [id]);
    broadcast('payment:deleted', { id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

export default router;
