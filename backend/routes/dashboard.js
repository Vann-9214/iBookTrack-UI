import express from 'express'
import { supabase, supabaseAdmin } from '../config/supabase.js'
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
router.get('/stats', async (req, res) => {
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
    let transmittedQuery = db
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
    const { count: transmittedBooks } = await transmittedQuery

    // Get unaccounted books count
    let unaccountedQuery = db
      .from('unaccounted_books')
      .select('id', { count: 'exact', head: true })
      .eq('resolved', false)
    const { count: unaccountedBooks } = await unaccountedQuery

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
        .select('id, isbn, title, box_number, lot_number, scanned_by_name, slip_printed, created_at')
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
          created_at: entry.completed_at || entry.created_at,
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
        message: `${entry.isbn}${entry.title ? ` · ${entry.title}` : ''}${entry.box_number ? ` · Box ${entry.box_number}` : ''}${entry.lot_number ? ` · Lot ${entry.lot_number}` : ''}${entry.scanned_by_name ? ` · ${entry.scanned_by_name}` : ''}`,
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

// Get transmission queue
router.get('/transmission-queue', async (req, res) => {
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
router.get('/unaccounted-books', async (req, res) => {
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
router.get('/pipeline-stats', async (req, res) => {
  try {
    const { lot_number } = req.query
    const db = supabaseAdmin || supabase

    let query = db.from('boxes').select('current_stage')

    if (lot_number) {
      const { data: lot } = await db
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
      qc: 0,
      scan: 0,
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
