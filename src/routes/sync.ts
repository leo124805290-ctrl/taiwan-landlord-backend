import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/all', async (req, res) => {
  const client = await pool.connect();
  try {
    const [props, rooms, payments, tenants, costs] = await Promise.all([
      client.query('SELECT * FROM properties ORDER BY id'),
      client.query('SELECT * FROM rooms ORDER BY id'),
      client.query('SELECT * FROM payments WHERE is_backfill = FALSE ORDER BY id'),
      client.query('SELECT * FROM tenants ORDER BY id'),
      client.query('SELECT * FROM costs ORDER BY id'),
    ]);

    const properties = props.rows.map(prop => {
      const propRooms = rooms.rows
        .filter(r => r.property_id === prop.id)
        .map(room => {
          const roomPayments = payments.rows.filter(p => p.room_id === room.id && p.status !== 'paid' && !p.archived);
          const roomHistory = payments.rows.filter(p => p.room_id === room.id && p.status === 'paid');
          const depositRecord = payments.rows.find(p => p.room_id === room.id && p.type === 'deposit' && !p.archived);

          return {
            id: room.id,
            f: (room.floor || 1).toString(),
            n: room.room_number || '',
            r: parseFloat(room.rent_amount) || 0,
            d: parseFloat(room.deposit_amount) || 0,
            s: room.status || 'available',
            t: room.tenant_name || '',
            p: room.tenant_phone || '',
            in: room.check_in_date ? room.check_in_date.toISOString().split('T')[0] : '',
            out: room.check_out_date ? room.check_out_date.toISOString().split('T')[0] : '',
            cm: parseFloat(room.current_meter) || 0,
            pm: parseFloat(room.previous_meter) || 0,
            current_tenant_id: room.current_tenant_id || null,
            payments: roomPayments.map(p => ({
              id: p.id,
              rid: room.id,
              n: room.room_number,
              t: p.tenant_name || '',
              m: p.month || '',
              r: parseFloat(p.rent_amount) || 0,
              u: parseFloat(p.electricity_usage) || 0,
              e: parseFloat(p.electricity_fee) || 0,
              total: parseFloat(p.total_amount) || 0,
              due: p.due_date ? p.due_date.toISOString().split('T')[0] : '',
              paid: p.paid_date ? p.paid_date.toISOString().split('T')[0] : '',
              s: p.status || 'pending',
              type: p.type || 'rent',
              paymentMethod: p.payment_method || 'cash',
              notes: p.notes || '',
            })),
            history: roomHistory.map(p => ({
              id: p.id,
              rid: room.id,
              n: room.room_number,
              t: p.tenant_name || '',
              m: p.month || '',
              r: parseFloat(p.rent_amount) || 0,
              u: parseFloat(p.electricity_usage) || 0,
              e: parseFloat(p.electricity_fee) || 0,
              total: parseFloat(p.total_amount) || 0,
              due: p.due_date ? p.due_date.toISOString().split('T')[0] : '',
              paid: p.paid_date ? p.paid_date.toISOString().split('T')[0] : '',
              s: p.status || 'paid',
              type: p.type || 'rent',
            })),
            maintenance: [],
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
        maintenance: [],
        utilityExpenses: costs.rows.filter(c => c.property_id === prop.id),
        additionalIncomes: [],
      };
    });

    res.json({
      success: true,
      data: {
        properties,
        tenants: tenants.rows,
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