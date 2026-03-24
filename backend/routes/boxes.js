import express from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

// Get all boxes (with optional filters)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { lot_id, current_stage, box_number } = req.query

    let query = supabase
      .from('boxes')
      .select(`
        *,
        lot:lots(lot_number, shipment_id, status),
        books:books(count)
      `)
      .order('created_at', { ascending: false })

    if (lot_id) query = query.eq('lot_id', lot_id)
    if (current_stage) query = query.eq('current_stage', current_stage)
    if (box_number) query = query.ilike('box_number', `%${box_number}%`)

    const { data, error } = await query

    if (error) throw error

    res.json({ boxes: data })
  } catch (error) {
    console.error('Get boxes error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get single box by ID with all books
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    const { data: box, error: boxError } = await supabase
      .from('boxes')
      .select(`
        *,
        lot:lots(lot_number, shipment_id, status),
        books:books(*)
      `)
      .eq('id', id)
      .single()

    if (boxError) throw boxError
    if (!box) return res.status(404).json({ error: 'Box not found' })

    res.json({ box })
  } catch (error) {
    console.error('Get box error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Create new box
router.post('/', requireAuth, async (req, res) => {
  try {
    const { box_number, lot_id, total_books, current_stage } = req.body

    if (!box_number || !lot_id) {
      return res.status(400).json({ error: 'box_number and lot_id are required' })
    }

    const { data, error } = await supabase
      .from('boxes')
      .insert({
        box_number,
        lot_id,
        total_books: total_books || 0,
        current_stage: current_stage || 'intake',
        books_received: 0,
        books_transmitted: 0
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ box: data })
  } catch (error) {
    console.error('Create box error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update box (e.g., move to next stage, update counts)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { current_stage, books_received, books_transmitted, total_books } = req.body

    const updateData = {}
    if (current_stage) updateData.current_stage = current_stage
    if (books_received !== undefined) updateData.books_received = books_received
    if (books_transmitted !== undefined) updateData.books_transmitted = books_transmitted
    if (total_books !== undefined) updateData.total_books = total_books

    const { data, error } = await supabase
      .from('boxes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // If stage changed, log pipeline event
    if (current_stage) {
      const { data: box } = await supabase
        .from('boxes')
        .select('lot_id')
        .eq('id', id)
        .single()

      await supabase.from('pipeline_events').insert({
        box_id: id,
        lot_id: box.lot_id,
        to_stage: current_stage,
        moved_by: req.user.id,
        moved_by_name: req.user.name || req.user.email
      })
    }

    res.json({ box: data })
  } catch (error) {
    console.error('Update box error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get boxes by lot number
router.get('/lot/:lot_number', requireAuth, async (req, res) => {
  try {
    const { lot_number } = req.params

    // First get the lot
    const { data: lot, error: lotError } = await supabase
      .from('lots')
      .select('id')
      .eq('lot_number', lot_number)
      .single()

    if (lotError) throw lotError
    if (!lot) return res.status(404).json({ error: 'Lot not found' })

    // Get all boxes for this lot
    const { data: boxes, error: boxesError } = await supabase
      .from('boxes')
      .select(`
        *,
        books:books(count)
      `)
      .eq('lot_id', lot.id)
      .order('box_number')

    if (boxesError) throw boxesError

    res.json({ boxes })
  } catch (error) {
    console.error('Get boxes by lot error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get pipeline stage counts (for Active Pipeline visualization)
router.get('/stats/pipeline', requireAuth, async (req, res) => {
  try {
    const { lot_number } = req.query

    let query = supabase
      .from('boxes')
      .select('current_stage')

    // If lot_number provided, filter by it
    if (lot_number) {
      const { data: lot } = await supabase
        .from('lots')
        .select('id')
        .eq('lot_number', lot_number)
        .single()

      if (lot) {
        query = query.eq('lot_id', lot.id)
      }
    }

    const { data, error } = await query

    if (error) throw error

    // Count boxes per stage
    const stageCounts = {
      intake: 0,
      cut: 0,
      inspection: 0,
      scan: 0,
      validation: 0,
      qa: 0,
      transmit: 0,
      storage: 0
    }

    data.forEach(box => {
      if (stageCounts[box.current_stage] !== undefined) {
        stageCounts[box.current_stage]++
      }
    })

    res.json({ stageCounts })
  } catch (error) {
    console.error('Get pipeline stats error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
