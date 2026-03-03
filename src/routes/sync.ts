import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/all', async (req, res) => {
  const client = await pool.connect();
  try {
    const [props, rooms, payments, tenants, maintenance, history] = await Promise.all([
      client.query('SELECT * FROM properties ORDER BY id'),
      client.query('SELECT * FROM rooms ORDER BY id'),
      client.query('SELECT * FROM payments ORDER BY id'),
      client.query('SELECT * FROM tenants ORDER BY id'),
      client.query('SELECT * FROM maintenance ORDER BY id'),
      client.query('SELECT * FROM history ORDER BY id'),
    ]);

    const properties = props.rows.map(prop => {
      const propRooms = rooms.rows
        .filter(r => r.property_id === prop.id)
        .map(room => {
          const roomPayments = payments.rows.filter(p => p.room_id === room.id && !p.archived);
          const roomHistory = payments.rows.filter(p => p.room_id === room.id && p.archived);

          return {
            id: room.id,
            f: (room.floor || '').toString(),
            n: room.room_number || '',
            r: parseFloat(room.rent_amount) || 0,
            d: parseFloat(room.deposit_amount) || 0,
            s: room.status === 'occupied' ? 'occupied' : 'available',
            t: room.tenant_name || '',
            in: room.check_in_date || '',
            out: room.check_out_date || '',
            cm: parseFloat(room.current_meter) || 0,
            pm: parseFloat(room.previous_meter) || 0,
            payments: roomPayments.map(p => ({
              id: p.id,
              amount: parseFloat(p.amount) || 0,
              type: p.type || '',
              date: p.payment_date || '',
              due: p.due_date || '',
              s: p.status || 'paid',
            })),
            history: roomHistory.map(p => ({
              id: p.id,
              amount: parseFloat(p.amount) || 0,
              type: p.type || '',
              date: p.payment_date || '',
            })),
          };
        });

      return {
        id: prop.id,
        name: prop.name || '',
        address: prop.address || '',
        owner_name: prop.owner_name || '',
        owner_phone: prop.owner_phone || '',
        rooms: propRooms,
        payments: propRooms.flatMap(r => r.payments),
        history: propRooms.flatMap(r => r.history),
        maintenance: maintenance.rows.filter(m => m.property_id === prop.id),
        utilityExpenses: [],
        additionalIncomes: [],
      };
    });

    res.json({
      success: true,
      data: {
        properties,
        rooms: rooms.rows,
        payments: payments.rows,
        tenants: tenants.rows,
        maintenance: maintenance.rows,
        history: history.rows,
        electricityRate: 6,
        actualElectricityRate: 4.5,
        sync_timestamp: new Date().toISOString(),
      }
    });
  } catch (err) {
    console.error('sync/all error:', err);
    res.status(500).json({ success: false, error: 'Database error' });
  } finally {
    client.release();
  }
});

export default router;
