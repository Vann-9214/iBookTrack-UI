import express from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

// Get all lots
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, shipment_id } = req.query

    let query = supabase
      .from('lots')
      .select(`
        *,
        shipment:shipments(shipment_code, status),
        boxes:boxes(count)
      `)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (shipment_id) query = query.eq('shipment_id', shipment_id)

    const { data, error } = await query

    if (error) throw error

    res.json({ lots: data })
  } catch (error) {
    console.error('Get lots error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get single lot by lot number
router.get('/:lot_number', requireAuth, async (req, res) => {
  try {
    const { lot_number } = req.params

    const { data, error } = await supabase
      .from('lots')
      .select(`
        *,
        shipment:shipments(*),
        boxes:boxes(*)
      `)
      .eq('lot_number', lot_number)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Lot not found' })

    res.json({ lot: data })
  } catch (error) {
    console.error('Get lot error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Create new lot
router.post('/', requireAuth, async (req, res) => {
  try {
    const { lot_number, shipment_id, total_boxes, status } = req.body

    if (!lot_number) {
      return res.status(400).json({ error: 'lot_number is required' })
    }

    const { data, error } = await supabase
      .from('lots')
      .insert({
        lot_number,
        shipment_id,
        total_boxes: total_boxes || 0,
        status: status || 'intake'
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ lot: data })
  } catch (error) {
    console.error('Create lot error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update lot
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const updateData = { ...req.body }

    delete updateData.id
    delete updateData.created_at

    const { data, error } = await supabase
      .from('lots')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ lot: data })
  } catch (error) {
    console.error('Update lot error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
