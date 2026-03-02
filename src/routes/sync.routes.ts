import express from 'express'
import { authenticate } from '../middleware/auth.middleware'
import db from '../db'

const router = express.Router()

router.get('/all', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id
    
    const propertiesResult: any = await db.query(
      'SELECT * FROM properties WHERE owner_id = $1 ORDER BY id',
      [userId]
    )
    
    const roomsResult: any = await db.query(
      'SELECT * FROM rooms WHERE property_id IN (SELECT id FROM properties WHERE owner_id = $1) ORDER BY id',
      [userId]
    )
    
    const paymentsResult: any = await db.query(
      'SELECT * FROM payments WHERE room_id IN (SELECT id FROM rooms WHERE property_id IN (SELECT id FROM properties WHERE owner_id = $1)) ORDER BY id',
      [userId]
    )
    
    const properties = (propertiesResult.rows || []).map((prop: any) => {
      const propRooms = (roomsResult.rows || [])
        .filter((r: any) => r.property_id === prop.id)
        .map((room: any) => {
          const roomPayments = (paymentsResult.rows || []).filter(
            (p: any) => p.room_id === room.id && !p.archived
          )
          const roomHistory = (paymentsResult.rows || []).filter(
            (p: any) => p.room_id === room.id && p.archived
          )
          
          return {
            id: room.id,
            f: room.floor?.toString() || '',
            n: room.room_number || '',
            r: parseFloat(room.monthly_rent) || 0,
            d: parseFloat(room.deposit) || 0,
            s: room.status === 'occupied' ? 'occupied' : 'available',
            t: room.tenant_name || '',
            in: room.check_in_date || '',
            out: room.check_out_date || '',
            cm: parseFloat(room.current_meter) || 0,
            pm: parseFloat(room.previous_meter) || 0,
            archived: room.archived || false,
            payments: roomPayments.map((p: any) => ({
              id: p.id,
              rid: p.room_id,
              n: room.room_number || '',
              t: room.tenant_name || '',
              m: p.month || '',
              r: parseFloat(p.rent_amount) || 0,
              u: parseFloat(p.electricity_usage) || 0,
              e: parseFloat(p.electricity_fee) || 0,
              total: parseFloat(p.total_amount) || 0,
              due: p.due_date || '',
              s: p.status || 'pending',
              paid: p.paid_date || undefined,
              paymentMethod: p.payment_method || undefined,
              notes: p.notes || undefined,
            })),
            history: roomHistory.map((p: any) => ({
              id: p.id,
              rid: p.room_id,
              n: room.room_number || '',
              t: room.tenant_name || '',
              m: p.month || '',
              r: parseFloat(p.rent_amount) || 0,
              u: parseFloat(p.electricity_usage) || 0,
              e: parseFloat(p.electricity_fee) || 0,
              total: parseFloat(p.total_amount) || 0,
              due: p.due_date || '',
              s: p.status || 'paid',
            })),
          }
        })
      
      return {
        id: prop.id,
        name: prop.name || '',
        address: prop.address || '',
        owner_name: prop.owner_name || '',
        owner_phone: prop.owner_phone || '',
        rooms: propRooms,
        payments: propRooms.flatMap((r: any) => r.payments),
        history: propRooms.flatMap((r: any) => r.history),
        maintenance: [],
        utilityExpenses: [],
        additionalIncomes: [],
      }
    })
    
    res.json({
      success: true,
      data: {
        properties,
        electricityRate: 6,
        actualElectricityRate: 4.5,
        utilityExpenses: [],
        additionalIncomes: [],
        sync_timestamp: new Date().toISOString()
      },
      message: '同步成功'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

router.get('/status', authenticate, async (req: any, res: any) => {
  res.json({
    success: true,
    data: {
      server_time: new Date().toISOString()
    },
    message: 'ok'
  })
})

export default router
