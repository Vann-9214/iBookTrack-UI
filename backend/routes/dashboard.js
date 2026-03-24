import express from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

// Get dashboard stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { lot_number, lot_range_start, lot_range_end } = req.query

    // Build lot filter
    let lotIds = null
    if (lot_number) {
      const { data: lot } = await supabase
        .from('lots')
        .select('id')
        .eq('lot_number', lot_number)
        .single()
      
      if (lot) lotIds = [lot.id]
    } else if (lot_range_start && lot_range_end) {
      const { data: lots } = await supabase
        .from('lots')
        .select('id')
        .gte('lot_number', lot_range_start)
        .lte('lot_number', lot_range_end)
      
      if (lots) lotIds = lots.map(l => l.id)
    }

    // Get total boxes
    let boxQuery = supabase.from('boxes').select('id', { count: 'exact', head: true })
    if (lotIds) boxQuery = boxQuery.in('lot_id', lotIds)
    const { count: totalBoxes } = await boxQuery

    // Get total books
    let bookQuery = supabase.from('books').select('id', { count: 'exact', head: true })
    if (lotIds) {
      const { data: boxes } = await supabase
        .from('boxes')
        .select('id')
        .in('lot_id', lotIds)
      if (boxes) {
        bookQuery = bookQuery.in('box_id', boxes.map(b => b.id))
      }
    }
    const { count: totalBooks } = await bookQuery

    // Get transmitted books count
    let transmittedQuery = supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('is_transmitted', true)
    if (lotIds) {
      const { data: boxes } = await supabase
        .from('boxes')
        .select('id')
        .in('lot_id', lotIds)
      if (boxes) {
        transmittedQuery = transmittedQuery.in('box_id', boxes.map(b => b.id))
      }
    }
    const { count: transmittedBooks } = await transmittedQuery

    // Get unaccounted books count
    let unaccountedQuery = supabase
      .from('unaccounted_books')
      .select('id', { count: 'exact', head: true })
      .eq('resolved', false)
    const { count: unaccountedBooks } = await unaccountedQuery

    // Get active lots count
    let activeLots = 0
    if (!lot_number && !lot_range_start) {
      const { count } = await supabase
        .from('lots')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'storage')
      activeLots = count
    } else {
      activeLots = lotIds ? lotIds.length : 0
    }

    res.json({
      stats: {
        totalBoxes: totalBoxes || 0,
        totalBooks: totalBooks || 0,
        transmittedBooks: transmittedBooks || 0,
        unaccountedBooks: unaccountedBooks || 0,
        activeLots: activeLots || 0,
        transmissionRate: totalBooks > 0 ? Math.round((transmittedBooks / totalBooks) * 100) : 0
      }
    })
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get transmission queue
router.get('/transmission-queue', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transmission_queue')
      .select(`
        *,
        lot:lots(lot_number),
        box:boxes(box_number)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    res.json({ queue: data })
  } catch (error) {
    console.error('Get transmission queue error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get unaccounted books
router.get('/unaccounted-books', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('unaccounted_books')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    res.json({ unaccountedBooks: data })
  } catch (error) {
    console.error('Get unaccounted books error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get pipeline stage counts
router.get('/pipeline-stats', requireAuth, async (req, res) => {
  try {
    const { lot_number } = req.query

    let query = supabase.from('boxes').select('current_stage')

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

// Get scan history
router.get('/scan-history', requireAuth, async (req, res) => {
  try {
    const { limit = 20 } = req.query

    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) throw error

    res.json({ scanHistory: data })
  } catch (error) {
    console.error('Get scan history error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
