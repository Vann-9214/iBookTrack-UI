/**
 * routes/lots.js
 *
 * Manages Lots — named groupings of boxes that arrive together in a shipment.
 * A Lot contains many Boxes; each Box contains many Books.
 *
 * Endpoints:
 *   GET  /api/lots             — List all lots (filterable by status, shipment_id)
 *   GET  /api/lots/:lot_number — Get a single lot with its shipment and all boxes
 *   POST /api/lots             — Create a new lot
 *   PUT  /api/lots/:id         — Update allowed fields on a lot (allowlisted)
 *
 * All routes require authentication (requireAuth middleware).
 */

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

// Update lot — only the explicitly listed fields can be changed via this route.
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    // Allowlist: only these fields may be updated through this generic endpoint.
    const ALLOWED_FIELDS = ['lot_number', 'shipment_id', 'total_boxes', 'status', 'notes']
    const updateData = {}
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field]
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' })
    }

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
