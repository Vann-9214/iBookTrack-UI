/**
 * routes/boxes.js
 *
 * Manages physical boxes that books are packed into as they move through
 * the intake → scan → transmit → storage pipeline.
 *
 * Endpoints:
 *   GET  /api/boxes                          — List all boxes (filterable by lot_id, stage, box_number)
 *   GET  /api/boxes/pipeline-transitions     — Recent pipeline stage transition history (for Checkpoint Monitor)
 *   GET  /api/boxes/stats/pipeline           — Count of boxes per stage (for pipeline visualization)
 *   GET  /api/boxes/lot/:lot_number          — Get all boxes belonging to a specific lot
 *   GET  /api/boxes/:id                      — Single box details including its scanned books and QC flags
 *   POST /api/boxes                          — Create a new box
 *   POST /api/boxes/:id/receive              — Mark a box as received at the current station
 *   POST /api/boxes/:id/advance              — Advance a box to the next pipeline stage
 *   POST /api/boxes/:id/rollback             — Roll a box back to a previous stage (undo)
 *   POST /api/boxes/:id/check-simflex        — Manually trigger a Simflex status check for a box
 *   PUT  /api/boxes/:id                      — Update box metadata (stage, counts)
 *
 * All routes require authentication (requireAuth middleware).
 */

import express from 'express'
import { supabase, supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

// Get all boxes (with optional filters)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { lot_id, current_stage, box_number, exclude_assigned_storage } = req.query

    const db = supabaseAdmin || supabase
    let query = db
      .from('boxes')
      .select(`
        *,
        lot:lots(lot_number, shipment_id, status),
        scans:warehouse_book_scans(count)
      `)
      .order('created_at', { ascending: false })

    if (lot_id) query = query.eq('lot_id', lot_id)
    if (current_stage) query = query.eq('current_stage', current_stage)
    if (box_number) query = query.ilike('box_number', `%${box_number}%`)

    const { data, error } = await query
    if (error) throw error

    let boxes = data

    // Exclude storage-stage boxes that are already placed in a storage slot
    if (exclude_assigned_storage === 'true') {
      const { data: assigned } = await db
        .from('storage_assignments')
        .select('box_id')
      const assignedIds = new Set((assigned || []).map(a => a.box_id))
      boxes = boxes.filter(b => !(b.current_stage === 'storage' && assignedIds.has(b.id)))
    }

    res.json({ boxes })
  } catch (error) {
    console.error('Get boxes error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get recent pipeline transitions (for Checkpoint Monitor logs)
router.get('/pipeline-transitions', requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query

    const db = supabaseAdmin || supabase
    const { data, error } = await db
      .from('pipeline_events')
      .select(`
        id,
        from_stage,
        to_stage,
        moved_by_name,
        notes,
        created_at,
        box:boxes(box_number, lot:lots(lot_number))
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) throw error

    res.json({ success: true, transitions: data })
  } catch (error) {
    console.error('Get pipeline transitions error:', error)
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
      warehouse: 0,
      inventory: 0,
      cut: 0,
      endorsement: 0,
      scan: 0,
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

// Get single box by ID with all scanned books
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    const db = supabaseAdmin || supabase
    const { data: box, error: boxError } = await db
      .from('boxes')
      .select(`
        *,
        lot:lots(lot_number, shipment_id, status)
      `)
      .eq('id', id)
      .single()

    if (boxError) throw boxError
    if (!box) return res.status(404).json({ error: 'Box not found' })

    // Pull scanned books from warehouse_book_scans for this box
    const { data: scans } = await db
      .from('warehouse_book_scans')
      .select('id, isbn, title, scan_status, scanned_at, rejection_reason')
      .eq('assigned_box_id', id)
      .order('scanned_at', { ascending: true })

    // Pull existing flags for all scans in this box
    const scanIds = (scans || []).map(s => s.id)
    let flagMap = {}
    if (scanIds.length > 0) {
      const { data: flags } = await db
        .from('qc_flags')
        .select('scan_id, issue, remarks, flagged_at, flagged_by_name')
        .in('scan_id', scanIds)
      ;(flags || []).forEach(f => { flagMap[f.scan_id] = f })
    }

    const books = (scans || []).map(s => {
      let flag = flagMap[s.id] || null
      // If non-processable but no explicit qc_flag entry, synthesize from rejection_reason
      if (!flag && s.scan_status === 'non_processable') {
        flag = {
          issue: s.rejection_reason || 'non-processable',
          remarks: '',
          flagged_at: s.scanned_at,
          flagged_by_name: 'Warehouse scan',
          source: 'scan_status',
        }
      }
      return { ...s, flag }
    })

    const totalFlagCount = books.filter(b => b.flag !== null).length
    res.json({ box: { ...box, books, flag_count: totalFlagCount } })
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

// Get boxes by lot number.
// Accepts the lot number in any common format: "64", "Lot-64", "LOT-64", "Lot 64", etc.
router.get('/lot/:lot_number', requireAuth, async (req, res) => {
  try {
    const { lot_number } = req.params
    const db = supabaseAdmin || supabase

    // Extract the numeric/alphanumeric part after any "Lot-" prefix
    const raw = lot_number.trim()
    const num = raw.replace(/^lot[-\s]*/i, '').trim()

    // Try candidates in order until one matches (case-insensitive)
    const candidates = [raw, `Lot-${num}`, `LOT-${num}`, `Lot ${num}`, `lot-${num}`]
    let lot = null
    for (const candidate of candidates) {
      const { data } = await db
        .from('lots')
        .select('id, lot_number')
        .ilike('lot_number', candidate)
        .maybeSingle()
      if (data) { lot = data; break }
    }

    if (!lot) return res.status(404).json({ success: false, error: 'Lot not found' })

    // Get all boxes for this lot
    const { data: boxes, error: boxesError } = await db
      .from('boxes')
      .select(`
        *,
        books:books(count)
      `)
      .eq('lot_id', lot.id)
      .order('box_number')

    if (boxesError) throw boxesError

    res.json({ success: true, boxes })
  } catch (error) {
    console.error('Get boxes by lot error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Receive box at current station (marks arrival, does NOT advance stage)
router.post('/:id/receive', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const db = supabaseAdmin || supabase

    const { data: box, error: boxError } = await db
      .from('boxes')
      .select('id, lot_id, current_stage, box_number')
      .eq('id', id)
      .single()

    if (boxError || !box) return res.status(404).json({ error: 'Box not found' })

    const { data: updatedBox, error: updateError } = await db
      .from('boxes')
      .update({ received_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log receipt event
    await db.from('pipeline_events').insert({
      box_id: id,
      lot_id: box.lot_id,
      from_stage: box.current_stage,
      to_stage: box.current_stage,
      moved_by: req.user.id,
      moved_by_name: req.user.user_metadata?.full_name || req.user.email,
      notes: `Received at ${box.current_stage}`
    })

    res.json({ success: true, box: updatedBox })
  } catch (error) {
    console.error('Receive box error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Advance box to next stage (checkpoint receive)
router.post('/:id/advance', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { notes } = req.body

    const STAGE_ORDER = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit', 'storage']

    const db = supabaseAdmin || supabase

    const { data: box, error: boxError } = await db
      .from('boxes')
      .select('*, lot:lots(lot_number)')
      .eq('id', id)
      .single()

    if (boxError || !box) return res.status(404).json({ error: 'Box not found', detail: boxError?.message })

    const currentIdx = STAGE_ORDER.indexOf(box.current_stage)
    if (currentIdx === -1 || currentIdx >= STAGE_ORDER.length - 1) {
      return res.status(400).json({ error: 'Box is already at the final stage' })
    }

    const nextStage = STAGE_ORDER[currentIdx + 1]

    // Update box stage and clear received_at for the new stage
    const { data: updatedBox, error: updateError } = await db
      .from('boxes')
      .update({ current_stage: nextStage, received_at: null })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log pipeline event
    await db.from('pipeline_events').insert({
      box_id: id,
      lot_id: box.lot_id,
      from_stage: box.current_stage,
      to_stage: nextStage,
      moved_by: req.user.id,
      moved_by_name: req.user.user_metadata?.full_name || req.user.email,
      notes: notes || null
    })

    res.json({ success: true, box: updatedBox, from_stage: box.current_stage, to_stage: nextStage })
  } catch (error) {
    console.error('Advance box stage error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Rollback box to previous stage (undo accidental advance)
router.post('/:id/rollback', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { to_stage } = req.body
    const db = supabaseAdmin || supabase

    const STAGE_ORDER = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit', 'storage']

    if (!to_stage || !STAGE_ORDER.includes(to_stage)) {
      return res.status(400).json({ error: 'Invalid target stage' })
    }

    const { data: box, error: boxError } = await db
      .from('boxes')
      .select('id, lot_id, current_stage')
      .eq('id', id)
      .single()

    if (boxError || !box) return res.status(404).json({ error: 'Box not found' })

    const { data: updatedBox, error: updateError } = await db
      .from('boxes')
      .update({ current_stage: to_stage })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    await db.from('pipeline_events').insert({
      box_id: id,
      lot_id: box.lot_id,
      from_stage: box.current_stage,
      to_stage,
      moved_by: req.user.id,
      moved_by_name: req.user.user_metadata?.full_name || req.user.email,
      notes: 'Rolled back (undo)'
    })

    res.json({ success: true, box: updatedBox })
  } catch (error) {
    console.error('Rollback box stage error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Check Simflex transmission status for all processable books in a box.
// If all are Transmission_Archive COMPLETED, auto-advance box from scan → transmit → storage.
// Box must be in 'scan' stage. Manual advance is still available separately.
router.post('/:id/check-simflex', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const db = supabaseAdmin || supabase
    const { getSimflexStatusForISBNs } = await import('../services/simflex-db.js')

    // 1. Get the box
    const { data: box, error: boxError } = await db
      .from('boxes')
      .select('id, lot_id, current_stage, box_number, lot:lots(lot_number)')
      .eq('id', id)
      .single()

    if (boxError || !box) return res.status(404).json({ success: false, error: 'Box not found' })

    if (box.current_stage !== 'scan') {
      return res.status(400).json({
        success: false,
        error: `Box is in '${box.current_stage}' stage, not 'scan'. Only boxes in scan stage can be checked.`
      })
    }

    // 2. Get all processable ISBNs in this box from warehouse_book_scans
    const { data: scans, error: scansError } = await db
      .from('warehouse_book_scans')
      .select('isbn, title, scan_status')
      .eq('assigned_box_id', id)
      .eq('scan_status', 'processable')

    if (scansError) throw scansError

    if (!scans || scans.length === 0) {
      return res.json({
        success: true,
        autoAdvanced: false,
        message: 'No processable books found in this box.',
        isbns: [],
        simflexResults: [],
        allCompleted: false,
      })
    }

    const isbns = [...new Set(scans.map(s => s.isbn))]

    // 3. Query Simflex for all ISBNs
    const simflexResult = await getSimflexStatusForISBNs(isbns)

    if (!simflexResult.success) {
      return res.status(502).json({
        success: false,
        error: 'Failed to reach Simflex: ' + (simflexResult.error || 'Unknown error'),
      })
    }

    const simflexData = simflexResult.data

    // 4. Check if every processable ISBN has Transmission_Archive COMPLETED
    const notCompleted = simflexData.filter(r => !r.transmissionCompleted)
    const allCompleted = notCompleted.length === 0

    // 5. If all done → auto-advance scan → transmit → storage
    let autoAdvanced = false
    let finalStage = box.current_stage

    if (allCompleted) {
      const ADVANCE_STAGES = ['transmit', 'storage']
      let currentStage = 'scan'

      for (const nextStage of ADVANCE_STAGES) {
        const { error: updateError } = await db
          .from('boxes')
          .update({ current_stage: nextStage, received_at: null })
          .eq('id', id)

        if (updateError) throw updateError

        await db.from('pipeline_events').insert({
          box_id: id,
          lot_id: box.lot_id,
          from_stage: currentStage,
          to_stage: nextStage,
          moved_by: req.user.id,
          moved_by_name: req.user.user_metadata?.full_name || req.user.email,
          notes: `Auto-advanced: all ${isbns.length} processable ISBNs confirmed Transmission_Archive COMPLETED in Simflex`,
        })

        currentStage = nextStage
      }

      autoAdvanced = true
      finalStage = 'storage'
    }

    return res.json({
      success: true,
      autoAdvanced,
      allCompleted,
      finalStage,
      totalProcessable: isbns.length,
      completedCount: simflexData.filter(r => r.transmissionCompleted).length,
      pendingCount: notCompleted.length,
      message: allCompleted
        ? `All ${isbns.length} books confirmed transmitted. Box automatically advanced to Storage.`
        : `${notCompleted.length} of ${isbns.length} books not yet completed in Simflex. Box remains in Scan.`,
      simflexResults: simflexData,
      notCompleted: notCompleted.map(r => ({ isbn: r.isbn, latestStatus: r.latestStatus })),
    })
  } catch (error) {
    console.error('Check Simflex error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/boxes/:id — hard delete box and all related records
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const db = supabaseAdmin || supabase

    // Verify box exists
    const { data: box, error: findError } = await db
      .from('boxes')
      .select('id, box_number')
      .eq('id', id)
      .single()

    if (findError || !box) {
      return res.status(404).json({ success: false, error: 'Box not found' })
    }

    // Delete dependents first (FK order)
    await db.from('warehouse_book_scans').delete().eq('assigned_box_id', id)
    await db.from('storage_assignments').delete().eq('box_id', id)
    await db.from('pipeline_events').delete().eq('box_id', id)

    // Delete the box itself
    const { error: deleteError } = await db.from('boxes').delete().eq('id', id)
    if (deleteError) throw deleteError

    res.json({ success: true, message: `Box ${box.box_number} deleted` })
  } catch (error) {
    console.error('Delete box error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
