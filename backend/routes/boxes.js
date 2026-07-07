/**
 * routes/boxes.js
 *
 * Manages physical boxes that books are packed into as they move through
 * the intake → scan → transmit → storage pipeline.
 *
 * Endpoints:
 *   GET  /api/boxes                          — List all boxes (filterable by lot_id, stage, box_number)
 *   GET  /api/boxes/pipeline-transitions     — Recent pipeline stage transition history (for Checkpoint Monitor)
 *   GET  /api/boxes/lot/:lot_number          — Get all boxes belonging to a specific lot
 *   GET  /api/boxes/:id                      — Single box details including its scanned books and QC flags
 *   POST /api/boxes/:id/receive              — Mark a box as received at the current station
 *   POST /api/boxes/:id/advance              — Advance a box to the next pipeline stage
 *   POST /api/boxes/:id/rollback             — Roll a box back to a previous stage (undo)
 *   POST /api/boxes/:id/check-simflex        — Manually trigger a Simflex status check for a box
 *   DELETE /api/boxes/:id                    — Delete a box and its related records
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
    const { lot_id, current_stage, box_number, exclude_assigned_storage, box_type } = req.query

    const db = supabaseAdmin || supabase
    let query = db
      .from('boxes')
      .select(`
        *,
        lot:lots(lot_number, shipment_id, type),
        books:books(
          scans:book_activity(count)
        ),
        box_sessions:box_sessions(id, status, warehouse_user_received, inventory_user_received, endorsement_user_received, inventory_user_send, warehouse_time_received)
      `)
      .order('created_at', { ascending: false })

    if (lot_id) query = query.eq('lot_id', lot_id)
    if (box_type) query = query.eq('box_type', box_type.charAt(0).toUpperCase() + box_type.slice(1).toLowerCase())
    if (current_stage) query = query.eq('current_stage', current_stage)
    if (box_number) query = query.ilike('box_number', `%${box_number}%`)

    const { data, error } = await query
    if (error) throw error

    let boxes = (data || []).map(b => {
      // Calculate total scans from books
      const totalScans = (b.books || []).reduce((sum, bk) => sum + (bk.scans?.[0]?.count || 0), 0)
      const { books, ...rest } = b
      return {
        ...rest,
        scans: [{ count: totalScans }]
      }
    })

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
    const { limit = 50, stage } = req.query

    const db = supabaseAdmin || supabase
    let query = db
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

    if (stage) {
      query = query.or(`from_stage.eq.${stage},to_stage.eq.${stage}`)
    }

    const { data, error } = await query

    if (error) throw error

    res.json({ success: true, transitions: data })
  } catch (error) {
    console.error('Get pipeline transitions error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Look up a single box by its box_number (for barcode scanning)
// GET /api/boxes/by-number/:box_number
router.get('/by-number/:box_number', requireAuth, async (req, res) => {
  try {
    const { box_number } = req.params
    const db = supabaseAdmin || supabase

    // Find box by exact box_number (case-insensitive)
    const { data: box, error: boxError } = await db
      .from('boxes')
      .select(`*, lot:lots(lot_number, shipment_id, type)`)
      .ilike('box_number', box_number.trim())
      .maybeSingle()

    if (boxError) throw boxError
    if (!box) return res.status(404).json({ error: 'Box not found' })

    // Pull scanned books from book_activity for this box
    const { data: scans } = await db
      .from('book_activity')
      .select('id, scan_status, warehouse_scan_at, books!inner(isbn, title, box_id, book_type)')
      .eq('books.box_id', box.id)
      .order('warehouse_scan_at', { ascending: true })

    const books = (scans || []).map(s => ({
      id: s.id,
      isbn: s.books?.isbn,
      title: s.books?.title,
      book_type: s.books?.book_type,
      scan_status: s.scan_status,
      scanned_at: s.warehouse_scan_at,
    }))

    res.json({ box: { ...box, books } })
  } catch (error) {
    console.error('Get box by number error:', error)
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
        lot:lots(lot_number, shipment_id, type)
      `)
      .eq('id', id)
      .single()

    if (boxError) throw boxError
    if (!box) return res.status(404).json({ error: 'Box not found' })

    // Pull scanned books from book_activity for this box
    const { data: scans } = await db
      .from('book_activity')
      .select('id, scan_status, warehouse_scan_at, user_flags(rejection_reason, notes), books!inner(isbn, title, box_id)')
      .eq('books.box_id', id)
      .order('warehouse_scan_at', { ascending: true })

    const books = (scans || []).map(s => {
      let flag = null;
      if (s.user_flags || s.scan_status === 'non_processable') {
        flag = {
          issue: s.user_flags?.rejection_reason || 'non-processable',
          remarks: s.user_flags?.notes || '',
          flagged_at: s.warehouse_scan_at,
          flagged_by_name: 'Warehouse scan',
          source: 'scan_status',
        }
      }
      return { ...s, isbn: s.books?.isbn, title: s.books?.title, flag }
    })

    const totalFlagCount = books.filter(b => b.flag !== null).length
    res.json({ box: { ...box, books, flag_count: totalFlagCount } })
  } catch (error) {
    console.error('Get box error:', error)
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
      .update({ updated_at: new Date().toISOString() })
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

    // Validate Scan → Transmit: all processable ISBNs must be verified in Simflex
    if (box.current_stage === 'scan' && nextStage === 'transmit') {
      const { getSimflexStatusForISBNs } = await import('../services/simflex-db.js')

      const { data: scans } = await db
        .from('book_activity')
        .select('books!inner(isbn, box_id)')
        .eq('books.box_id', id)
        .eq('scan_status', 'processable')

      const isbns = [...new Set((scans || []).map(s => s.books?.isbn))]

      if (isbns.length > 0) {
        const simflexResult = await getSimflexStatusForISBNs(isbns)
        if (!simflexResult.success) {
          return res.status(502).json({
            error: 'Failed to reach Simflex for validation: ' + (simflexResult.error || 'Unknown error')
          })
        }

        const pending = simflexResult.data.filter(r => !r.transmissionCompleted)
        if (pending.length > 0) {
          return res.status(400).json({
            error: `${pending.length} of ${isbns.length} processable ISBNs are not yet verified in Simflex.`,
            pending_isbns: pending.map(r => r.isbn),
            simflex_status: simflexResult.data
          })
        }
      }
    }

    // Update box stage for the new stage
    const { data: updatedBox, error: updateError } = await db
      .from('boxes')
      .update({ current_stage: nextStage })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // If advancing from warehouse to inventory, mark the box_session as received
    if (box.current_stage === 'warehouse' && nextStage === 'inventory') {
      await db
        .from('box_sessions')
        .update({ status: 'received', inventory_user_received: req.user.id, inventory_time_received: new Date().toISOString() })
        .eq('box_id', id)
        .eq('status', 'completed')
    }
    // If advancing FROM inventory TO cut (or endorsement), record the inventory send user
    if (box.current_stage === 'inventory' && (nextStage === 'cut' || nextStage === 'endorsement' || nextStage === 'qa')) {
      const { data: session } = await db
        .from('box_sessions')
        .select('id')
        .eq('box_id', id)
        .order('warehouse_time_received', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (session) {
        await db
          .from('box_sessions')
          .update({ inventory_user_send: req.user.id, inventory_time_send: new Date().toISOString() })
          .eq('id', session.id)
      }
    }

    // If advancing from inventory to endorsement (qa), record the endorsement user
    if ((box.current_stage === 'inventory' || box.current_stage === 'cut') && (nextStage === 'endorsement' || nextStage === 'qa')) {
      // Get the latest session to update
      const { data: session } = await db
        .from('box_sessions')
        .select('id')
        .eq('box_id', id)
        .order('warehouse_time_received', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (session) {
        await db
          .from('box_sessions')
          .update({ endorsement_user_received: req.user.id, endorsement_time_received: new Date().toISOString() })
          .eq('id', session.id)
      }
    }

    // If advancing from endorsement to scan, record the endorsement send user
    if ((box.current_stage === 'endorsement' || box.current_stage === 'qa') && nextStage === 'scan') {
      const { data: session } = await db
        .from('box_sessions')
        .select('id')
        .eq('box_id', id)
        .order('warehouse_time_received', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (session) {
        await db
          .from('box_sessions')
          .update({ endorsement_user_send: req.user.id, endorsement_time_send: new Date().toISOString() })
          .eq('id', session.id)
      }
    }

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

// Get enriched transmission view for a box: all ISBNs with Simflex status + transmission date
// GET /api/boxes/:id/transmission
router.get('/:id/transmission', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const db = supabaseAdmin || supabase

    // 1. Resolve box — accept UUID or box_number
    let box = null
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRe.test(id)) {
      const { data, error } = await db
        .from('boxes')
        .select('id, box_number, current_stage, lot:lots(lot_number)')
        .eq('id', id)
        .single()
      if (error) throw error
      box = data
    } else {
      const { data, error } = await db
        .from('boxes')
        .select('id, box_number, current_stage, lot:lots(lot_number)')
        .ilike('box_number', id)
        .maybeSingle()
      if (error) throw error
      box = data
    }

    if (!box) return res.status(404).json({ success: false, error: 'Box not found' })

    // 2. Get all scans for this box
    const { data: scans, error: scansError } = await db
      .from('book_activity')
      .select('id, scan_status, user_flags(rejection_reason), warehouse_scan_at, books!inner(isbn, title, box_id)')
      .eq('books.box_id', box.id)
      .order('warehouse_scan_at', { ascending: true })

    if (scansError) throw scansError

    const allScans = scans || []
    const processableScans = allScans.filter(s => s.scan_status === 'processable')

    // 3. Batch-fetch Simflex status for all processable ISBNs
    const { getSimflexStatusForISBNs } = await import('../services/simflex-db.js')
    const uniqueIsbns = [...new Set(processableScans.map(s => s.books?.isbn))]
    let simflexMap = {}
    if (uniqueIsbns.length > 0) {
      const result = await getSimflexStatusForISBNs(uniqueIsbns)
      if (result.success) {
        for (const r of result.data) simflexMap[r.isbn] = r
      }
    }

    // 4. Build enriched rows
    const booksList = allScans.map(s => {
      const isbn = s.books?.isbn;
      const sf = simflexMap[isbn] || {}
      return {
        scan_id: s.id,
        isbn: isbn,
        title: s.books?.title || null,
        scan_status: s.scan_status,
        rejection_reason: s.user_flags?.rejection_reason || null,
        warehouse_scan_at: s.warehouse_scan_at,
        simflex_status: sf.latestStatus || null,
        transmission_completed: sf.transmissionCompleted || false,
        transmission_date: sf.transmissionCompleted ? (sf.latestUpdated || null) : null,
        scan_user: sf.scanUser || null,
      }
    })

    const transmitted = booksList.filter(b => b.transmission_completed).length
    const wip = booksList.filter(b => b.scan_status === 'processable' && !b.transmission_completed).length
    const non_processable = booksList.filter(b => b.scan_status === 'non_processable').length

    res.json({
      success: true,
      box: {
        id: box.id,
        box_number: box.box_number,
        current_stage: box.current_stage,
        lot_number: box.lot?.lot_number || null,
      },
      summary: { total: allScans.length, transmitted, wip, non_processable },
      books: booksList,
    })
  } catch (error) {
    console.error('Box transmission view error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Check Simflex transmission status for all processable books in a box.
// If all are Transmission_Archive COMPLETED, auto-advance box from scan → transmit.
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

    // 2. Get all processable ISBNs in this box from book_activity
    const { data: scans, error: scansError } = await db
      .from('book_activity')
      .select('scan_status, books!inner(isbn, title, box_id)')
      .eq('books.box_id', id)
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

    const isbns = [...new Set(scans.map(s => s.books?.isbn))]

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

    // 5. If all done → auto-advance scan → transmit
    let autoAdvanced = false
    let finalStage = box.current_stage

    if (allCompleted) {
      const nextStage = 'transmit'
      const { error: updateError } = await db
        .from('boxes')
        .update({ current_stage: nextStage })
        .eq('id', id)

      if (updateError) throw updateError

      await db.from('pipeline_events').insert({
        box_id: id,
        lot_id: box.lot_id,
        from_stage: 'scan',
        to_stage: nextStage,
        moved_by: req.user.id,
        moved_by_name: req.user.user_metadata?.full_name || req.user.email,
        notes: `Auto-advanced: all ${isbns.length} processable ISBNs confirmed Transmission_Archive COMPLETED in Simflex`,
      })

      autoAdvanced = true
      finalStage = nextStage
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
        ? `All ${isbns.length} books confirmed transmitted. Box automatically advanced to Transmission.`
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
    const { data: booksToDelete } = await db.from('books').select('id').eq('box_id', id)
    if (booksToDelete && booksToDelete.length > 0) {
      await db.from('book_activity').delete().in('book_id', booksToDelete.map(b => b.id))
      await db.from('books').delete().in('id', booksToDelete.map(b => b.id))
    }
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
