/**
 * routes/dashboard.js
 *
 * Provides aggregated statistics and live notifications for the main dashboard.
 *
 * Endpoints:
 *   GET /api/dashboard/stats         — Summary counts: boxes, books, transmitted, QC flags, active lots
 *                                      Supports optional filtering by lot_number or lot range
 *   GET /api/dashboard/qc-flags      — List of all open QC flags (books flagged for issues)
 *   GET /api/dashboard/notifications — Live feed of recent transmission, pipeline, scan, and unaccounted events
 *
 * All routes require authentication (requireAuth middleware).
 */

import express from 'express'
import { supabase, supabaseAdmin } from '../config/supabase.js'
import simflexDb from '../services/simflex-db.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

function formatStageLabel(stage) {
  const labels = {
    intake: 'Intake',
    cut: 'Cut',
    inspection: 'Inspection',
    scan: 'Scan',
    validation: 'Validation',
    qa: 'QA',
    transmit: 'Transmit',
    storage: 'Storage',
  }

  return labels[stage] || stage || 'Unknown stage'
}

function formatRelativeTime(value) {
  if (!value) return 'just now'

  try {
    const timestamp = new Date(value).getTime()
    if (Number.isNaN(timestamp)) return 'just now'

    const elapsedSeconds = Math.round((Date.now() - timestamp) / 1000)

    if (elapsedSeconds < 60) return 'just now'

    const elapsedMinutes = Math.round(elapsedSeconds / 60)
    if (elapsedMinutes < 60) return `${elapsedMinutes} minute${elapsedMinutes === 1 ? '' : 's'} ago`

    const elapsedHours = Math.round(elapsedMinutes / 60)
    if (elapsedHours < 24) return `${elapsedHours} hour${elapsedHours === 1 ? '' : 's'} ago`

    const elapsedDays = Math.round(elapsedHours / 24)
    return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`
  } catch {
    return 'just now'
  }
}

function buildNotificationId(source, id) {
  return `${source}:${id}`
}

function buildNotification(payload) {
  return {
    ...payload,
    timestamp: formatRelativeTime(payload.created_at),
  }
}

// Get dashboard stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { lot_number, lot_range_start, lot_range_end } = req.query
    const db = supabaseAdmin || supabase

    // Build lot filter
    let lotIds = null
    if (lot_number) {
      const { data: lot } = await db
        .from('lots')
        .select('id')
        .eq('lot_number', lot_number)
        .single()
      
      if (lot) lotIds = [lot.id]
    } else if (lot_range_start && lot_range_end) {
      const { data: lots } = await db
        .from('lots')
        .select('id')
        .gte('lot_number', lot_range_start)
        .lte('lot_number', lot_range_end)
      
      if (lots) lotIds = lots.map(l => l.id)
    }

    // Get total boxes
    let boxQuery = db.from('boxes').select('id', { count: 'exact', head: true })
    if (lotIds) boxQuery = boxQuery.in('lot_id', lotIds)
    const { count: totalBoxes } = await boxQuery

    // Get total books
    let bookQuery = db.from('books').select('id', { count: 'exact', head: true })
    if (lotIds) {
      const { data: boxes } = await db
        .from('boxes')
        .select('id')
        .in('lot_id', lotIds)
      if (boxes) {
        bookQuery = bookQuery.in('box_id', boxes.map(b => b.id))
      }
    }
    const { count: totalBooks } = await bookQuery

    // Get transmitted books count
    // Get transmitted books count (TODO: Re-implement using book_activity later)
    let transmittedBooks = 0
    /* let transmittedQuery = db
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('is_transmitted', true)
    if (lotIds) {
      const { data: boxes } = await db
        .from('boxes')
        .select('id')
        .in('lot_id', lotIds)
      if (boxes) {
        transmittedQuery = transmittedQuery.in('box_id', boxes.map(b => b.id))
      }
    }
    const { count } = await transmittedQuery
    transmittedBooks = count || 0 */

    // Get flagged books count from user_flags (always use admin to bypass RLS)
    const adminDb = supabaseAdmin || db
    const { count: unaccountedBooks, error: flagCountError } = await adminDb
      .from('user_flags')
      .select('id', { count: 'exact', head: true })
    if (flagCountError) console.warn('user_flags count error:', flagCountError.message)

    // Get active lots count
    let activeLots = 0
    if (!lot_number && !lot_range_start) {
      const { count } = await db
        .from('lots')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'storage')
      activeLots = count
    } else {
      activeLots = lotIds ? lotIds.length : 0
    }

    res.json({
      success: true,
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

// Get open lots with detailed stats
router.get('/open-lots', async (req, res) => {
  try {
    const db = supabaseAdmin || supabase

    // Fetch lots that are not yet fully stored (status != 'storage')
    const { data: lots, error: lotsError } = await db
      .from('lots')
      .select(`
        id,
        lot_number,
        status,
        shipment:shipments(shipment_code)
      `)
      .neq('status', 'storage')
      .order('created_at', { ascending: false })

    if (lotsError) throw lotsError
    if (!lots || lots.length === 0) {
      return res.json({ success: true, lots: [] })
    }

    const lotIds = lots.map(l => l.id)

    // Fetch boxes belonging to those lots
    const { data: boxes, error: boxesError } = await db
      .from('boxes')
      .select('id, lot_id, total_books_expected')
      .in('lot_id', lotIds)

    if (boxesError) throw boxesError

    const boxIds = (boxes || []).map(b => b.id)

    // Count transmitted books per box
    // Count transmitted books per box (TODO: Re-implement using book_activity later)
    const transmittedByBox = {}
    /* const { data: transmittedBooks, error: transmittedError } = await db
      .from('books')
      .select('box_id')
      .in('box_id', boxIds)
      .eq('is_transmitted', true)

    if (transmittedError) throw transmittedError

    ;(transmittedBooks || []).forEach(b => {
      transmittedByBox[b.box_id] = (transmittedByBox[b.box_id] || 0) + 1
    }) */

    // Aggregate by lot
    const boxesByLot = {}
    const totalBooksByLot = {}
    const transmittedByLot = {}

    ;(boxes || []).forEach(box => {
      boxesByLot[box.lot_id] = (boxesByLot[box.lot_id] || 0) + 1
      totalBooksByLot[box.lot_id] = (totalBooksByLot[box.lot_id] || 0) + (box.total_books_expected || 0)
      transmittedByLot[box.lot_id] = (transmittedByLot[box.lot_id] || 0) + (transmittedByBox[box.id] || 0)
    })

    const formattedLots = lots.map(lot => {
      const totalBoxes = boxesByLot[lot.id] || 0
      const totalBooks = totalBooksByLot[lot.id] || 0
      const transmittedBooks = transmittedByLot[lot.id] || 0
      const completionProgress = totalBooks > 0
        ? Math.round((transmittedBooks / totalBooks) * 100)
        : 0

      return {
        id: lot.id,
        lot_number: lot.lot_number,
        shipment_code: lot.shipment?.shipment_code || null,
        total_boxes: totalBoxes,
        total_books: totalBooks,
        status: formatStageLabel(lot.status),
        completion_progress: completionProgress,
      }
    })

    res.json({ success: true, lots: formattedLots })
  } catch (error) {
    console.error('Get open lots error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get QC flagged books list
router.get('/qc-flags', requireAuth, async (req, res) => {
  try {
    const db = supabaseAdmin || supabase
    const { data, error } = await db
      .from('user_flags')
      .select('id, book_activity_id, rejection_reason, notes, warehouse_flag_by, warehouse_flag_at, book_activity(books(isbn, title, box_id))')
      .order('warehouse_flag_at', { ascending: false })
    if (error) throw error
    
    const mappedFlags = (data || []).map(f => ({
      scan_id: f.id,
      isbn: f.book_activity?.books?.isbn,
      title: f.book_activity?.books?.title,
      box_id: f.book_activity?.books?.box_id,
      issue: f.rejection_reason,
      remarks: f.notes,
      flagged_at: f.warehouse_flag_at
    }))
    
    res.json({ success: true, flags: mappedFlags })
  } catch (error) {
    console.error('Get QC flags error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get live notifications
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const requestedLimit = parseInt(req.query.limit || '20', 10)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 20
    const db = supabaseAdmin || supabase

    const [transmissionResult, unaccountedResult, scanResult, pipelineResult] = await Promise.all([
      db
        .from('transmission_queue')
        .select(`
          id,
          status,
          books_received,
          books_transmitted,
          error_message,
          created_at,
          completed_at,
          lot:lots(lot_number),
          box:boxes(box_number)
        `)
        .order('created_at', { ascending: false })
        .limit(limit),
      db
        .from('unaccounted_books')
        .select('id, isbn, lot_number, stage_detected, reported_by_name, notes, created_at')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(limit),
      db
        .from('scan_history')
        .select('id, isbn, title, box_number, lot_number, slip_printed, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
      db
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
        .limit(limit),
    ])

    if (transmissionResult.error) throw transmissionResult.error
    if (unaccountedResult.error) throw unaccountedResult.error
    if (scanResult.error) throw scanResult.error
    if (pipelineResult.error) throw pipelineResult.error

    const notifications = [
      ...(transmissionResult.data || []).map((entry) => {
        const status = entry.status || 'pending'
        const type = status === 'completed'
          ? 'success'
          : status === 'failed'
            ? 'error'
            : status === 'in_progress'
              ? 'info'
              : 'warning'

        const statusLabels = {
          pending: 'Transmission Queued',
          in_progress: 'Transmission In Progress',
          completed: 'Transmission Completed',
          failed: 'Transmission Failed',
        }

        const lotNumber = entry.lot?.lot_number || 'Unknown lot'
        const boxNumber = entry.box?.box_number ? ` | ${entry.box.box_number}` : ''
        const totals = `${entry.books_transmitted || 0}/${entry.books_received || 0} books`
        const details = entry.error_message
          ? `${totals} · ${entry.error_message}`
          : totals

        return buildNotification({
          id: buildNotificationId('transmission', entry.id),
          source: 'transmission',
          type,
          title: statusLabels[status] || 'Transmission Update',
          message: `${lotNumber}${boxNumber} · ${details}`,
          read: status === 'completed',
          created_at: entry.warehouse_time_received || entry.created_at,
        })
      }),
      ...(unaccountedResult.data || []).map((entry) => buildNotification({
        id: buildNotificationId('unaccounted', entry.id),
        source: 'unaccounted',
        type: 'error',
        title: 'Unaccounted Book Detected',
        message: `${entry.isbn} · ${entry.lot_number} · ${entry.stage_detected}${entry.reported_by_name ? ` · ${entry.reported_by_name}` : ''}${entry.notes ? ` · ${entry.notes}` : ''}`,
        read: false,
        created_at: entry.created_at,
      })),
      ...(scanResult.data || []).map((entry) => buildNotification({
        id: buildNotificationId('scan', entry.id),
        source: 'scan',
        type: entry.slip_printed ? 'success' : 'info',
        title: entry.slip_printed ? 'Scan Slip Printed' : 'Book Scan Recorded',
        message: `${entry.isbn}${entry.title ? ` · ${entry.title}` : ''}${entry.box_number ? ` · Box ${entry.box_number}` : ''}${entry.lot_number ? ` · Lot ${entry.lot_number}` : ''}`,
        read: true,
        created_at: entry.created_at,
      })),
      ...(pipelineResult.data || []).map((entry) => {
        const toStage = entry.to_stage || 'unknown'
        const type = toStage === 'transmit' || toStage === 'storage'
          ? 'success'
          : toStage === 'validation' || toStage === 'cut' || toStage === 'inspection'
            ? 'warning'
            : 'info'

        return buildNotification({
          id: buildNotificationId('pipeline', entry.id),
          source: 'pipeline',
          type,
          title: `${entry.box?.box_number || 'Box'} moved to ${formatStageLabel(toStage)}`,
          message: `${entry.box?.lot?.lot_number || 'Unknown lot'}${entry.from_stage ? ` · ${formatStageLabel(entry.from_stage)} → ${formatStageLabel(toStage)}` : ` · ${formatStageLabel(toStage)}`}${entry.moved_by_name ? ` · ${entry.moved_by_name}` : ''}${entry.notes ? ` · ${entry.notes}` : ''}`,
          read: toStage === 'storage',
          created_at: entry.created_at,
        })
      }),
    ]
      .filter((notification) => notification.created_at)
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, limit)

    res.json({
      success: true,
      notifications,
      unreadCount: notifications.filter((notification) => !notification.read).length,
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get enhanced lot details — stage breakdown, book status counts, completion progress
router.get('/lot-details/:lot_number', requireAuth, async (req, res) => {
  try {
    const { lot_number } = req.params
    const db = supabaseAdmin || supabase

    // Fuzzy lot number resolution (same logic as boxes.js /lot/:lot_number)
    const raw = lot_number.trim()
    const num = raw.replace(/^lot[-\s]*/i, '').trim()
    const candidates = [raw, `Lot-${num}`, `LOT-${num}`, `Lot ${num}`, `lot-${num}`]

    let lot = null
    for (const candidate of candidates) {
      const { data } = await db
        .from('lots')
        .select('id, lot_number, type')
        .ilike('lot_number', candidate)
        .maybeSingle()
      if (data) { lot = data; break }
    }

    if (!lot) return res.status(404).json({ success: false, error: 'Lot not found' })

    // Fetch all boxes for this lot
    const { data: boxes, error: boxesError } = await db
      .from('boxes')
      .select('id, current_stage, total_books_expected, books_transmitted')
      .eq('lot_id', lot.id)
      .order('box_number')
    if (boxesError) throw boxesError

    const boxIds = (boxes || []).map(b => b.id)

    // Stage breakdown from boxes
    const stageBreakdown = {}
    ;(boxes || []).forEach(box => {
      stageBreakdown[box.current_stage] = (stageBreakdown[box.current_stage] || 0) + 1
    })

    // Book status counts in one query
    let processable = 0, nonProcessable = 0, transmitted = 0, totalBooks = 0
    if (boxIds.length > 0) {
      const { data: books } = await db
        .from('books')
        .select('is_transmitted, box_id')
        .in('box_id', boxIds)

      totalBooks = (books || []).length
      ;(books || []).forEach(b => {
        if (b.is_transmitted) transmitted++
      })

      // book_activity holds scan_status per book
      const { data: activity } = await db
        .from('book_activity')
        .select('scan_status, book_id, books!inner(box_id)')
        .in('books.box_id', boxIds)

      ;(activity || []).forEach(a => {
        if (a.scan_status === 'processable') processable++
        else if (a.scan_status === 'non_processable') nonProcessable++
      })
    }

    const totalBoxes = (boxes || []).length
    const completionProgress = totalBooks > 0
      ? Math.round((transmitted / totalBooks) * 100)
      : 0

    const processingStatus = completionProgress === 100
      ? 'Completed'
      : completionProgress > 0
        ? 'In Progress'
        : 'Not Started'

    res.json({
      success: true,
      lotDetails: {
        lot_number: lot.lot_number,
        lot_type: lot.type || null,
        total_boxes: totalBoxes,
        total_books: totalBooks,
        completion_progress: completionProgress,
        processing_status: processingStatus,
        stage_breakdown: stageBreakdown,
        books_by_status: {
          transmitted,
          pending: totalBooks - transmitted,
          processable,
          non_processable: nonProcessable,
        },
      },
    })
  } catch (error) {
    console.error('Get lot details error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get pipeline stage counts
router.get('/pipeline-stats', async (req, res) => {
  try {
    const { lot_number } = req.query
    const db = supabaseAdmin || supabase

    let lotId = null
    if (lot_number) {
      const { data: lot } = await db
        .from('lots')
        .select('id')
        .eq('lot_number', lot_number)
        .single()

      if (lot) lotId = lot.id
    }

    let query = db.from('boxes').select('id, current_stage')
    if (lotId) query = query.eq('lot_id', lotId)

    const { data: boxes, error: boxesError } = await query
    if (boxesError) throw boxesError

    const boxIds = (boxes || []).map(b => b.id)

    // Boxes already placed in a storage slot should not count toward the Storage stage
    let assignedQuery = db.from('storage_assignments').select('box_id')
    if (boxIds.length > 0) assignedQuery = assignedQuery.in('box_id', boxIds)
    const { data: assignedBoxes, error: assignedError } = await assignedQuery
    if (assignedError) throw assignedError

    const assignedBoxIds = new Set((assignedBoxes || []).map(a => a.box_id))

    const stageCounts = {
      warehouse: 0,
      inventory: 0,
      cut: 0,
      endorsement: 0,
      scan: 0,
      transmit: 0,
      storage: 0
    }

    ;(boxes || []).forEach(box => {
      if (stageCounts[box.current_stage] === undefined) return
      // Exclude boxes that reached storage but are already assigned to a location
      if (box.current_stage === 'storage' && assignedBoxIds.has(box.id)) return
      stageCounts[box.current_stage]++
    })

    // Scan and Transmit stages are driven by live Simflex status (default Mustang), not Supabase.
    try {
      const [scanResult, transmitResult] = await Promise.all([
        simflexDb.getScanStageBoxes(),
        simflexDb.getTransmitStageBoxes(),
      ])
      stageCounts.scan = scanResult.success ? scanResult.count : 0
      stageCounts.transmit = transmitResult.success ? transmitResult.count : 0
    } catch (simflexError) {
      console.warn('Simflex stage count failed:', simflexError.message)
      stageCounts.scan = 0
      stageCounts.transmit = 0
    }

    res.json({ stageCounts })
  } catch (error) {
    console.error('Get pipeline stats error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
