import { Router } from 'express';
import { pool } from '../db/pool';
import { broadcast } from '../services/websocket';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rooms ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    console.error('Get rooms error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { property_id, floor, room_number, monthly_rent, deposit, status, tenant_name, check_in_date, check_out_date, current_meter, previous_meter } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO rooms (property_id, floor, room_number, monthly_rent, deposit, status, tenant_name, check_in_date, check_out_date, current_meter, previous_meter) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
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
      ]
    );
    broadcast('room:created', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('Create room error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { floor, room_number, monthly_rent, deposit, status, tenant_name, check_in_date, check_out_date, current_meter, previous_meter } = req.body;
  try {
    const result = await pool.query(
      `UPDATE rooms SET floor=$1, room_number=$2, monthly_rent=$3, deposit=$4, status=$5, tenant_name=$6, check_in_date=$7, check_out_date=$8, current_meter=$9, previous_meter=$10, updated_at=NOW() WHERE id=$11 RETURNING *`,
      [floor, room_number, monthly_rent, deposit, status, tenant_name || null, check_in_date || null, check_out_date || null, current_meter || 0, previous_meter || 0, id]
    );
    broadcast('room:updated', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('Update room error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM rooms WHERE id=$1', [id]);
    broadcast('room:deleted', { id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
