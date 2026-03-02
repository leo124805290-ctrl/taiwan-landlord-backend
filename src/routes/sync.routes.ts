import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { db } from '../db'

const router = Router()

router.get('/all', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id
    
    const properties = await db.query(
      'SELECT * FROM properties WHERE owner_id = $1',
      [userId]
    )
    
    const rooms = await db.query(
      'SELECT * FROM rooms WHERE property_id IN (SELECT id FROM properties WHERE owner_id = $1)',
      [userId]
    )
    
    const payments = await db.query(
      'SELECT * FROM payments WHERE room_id IN (SELECT id FROM rooms WHERE property_id IN (SELECT id FROM properties WHERE owner_id = $1))',
      [userId]
    )
    
    res.json({
      success: true,
      data: {
        properties: properties.rows,
        rooms: rooms.rows,
        payments: payments.rows,
        tenants: [],
        maintenance: [],
        history: [],
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
