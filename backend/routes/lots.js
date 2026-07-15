/**
 * routes/lots.js
 *
 * Manages Lots — named groupings of boxes.
 * A Lot contains many Boxes; each Box contains many Books.
 *
 * Endpoints:
 *   GET  /api/lots             — List all lots (filterable by status)
 *   GET  /api/lots/:lot_number — Get a single lot with all its boxes
 *   GET  /api/lots/:lot_number/transmission-summary — Lot transmission status from Simflex
 *
 * All routes require authentication (requireAuth middleware).
 */

import express from 'express'
import { supabase, supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

// Get lots with search + pagination (scalable for 10k+ lots)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, limit: rawLimit, offset: rawOffset } = req.query
    const limit = Math.min(parseInt(rawLimit) || 50, 100)
    const offset = parseInt(rawOffset) || 0

    const db = supabaseAdmin || supabase

    // Count query (for total)
    let countQuery = db.from('lots').select('*', { count: 'exact', head: true })
    if (search) countQuery = countQuery.ilike('lot_number', `%${search}%`)
    const { count: totalCount } = await countQuery

    // Data query with pagination
    let query = db
      .from('lots')
      .select(`
        id, lot_number, total_boxes, type, created_at,
        boxes:boxes(count)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) query = query.ilike('lot_number', `%${search}%`)

    const { data, error } = await query

    if (error) throw error

    res.json({
      lots: data,
      total: totalCount || 0,
      limit,
      offset,
      hasMore: offset + limit < (totalCount || 0),
    })
  } catch (error) {
    console.error('Get lots error:', error)
    res.status(500).json({ error: error.message })
  }
})

// LOT-level transmission summary: all ISBNs in lot with Simflex status + WIP breakdown
// GET /api/lots/:lot_number/transmission-summary
router.get('/:lot_number/transmission-summary', requireAuth, async (req, res) => {
  try {
    const { lot_number } = req.params
    const db = supabaseAdmin || supabase

    // 1. Resolve lot
    let lotQuery = db.from('lots').select('id, lot_number')
    
    if (lot_number.toLowerCase() === 'latest') {
      lotQuery = lotQuery.order('created_at', { ascending: false }).limit(1).single()
    } else {
      lotQuery = lotQuery.ilike('lot_number', lot_number).maybeSingle()
    }

    const { data: lot, error: lotError } = await lotQuery

    if (lotError && lot_number.toLowerCase() !== 'latest') throw lotError
    if (lotError || !lot) return res.status(404).json({ success: false, error: 'Lot not found' })

    // 2. Get all book_activity for this lot (via boxes)
    const { data: boxes } = await db
      .from('boxes')
      .select('id')
      .eq('lot_id', lot.id)

    const boxIds = (boxes || []).map(b => b.id)
    if (boxIds.length === 0) {
      return res.json({
        success: true,
        lot_number: lot.lot_number,
        lot_id: lot.id,
        total: 0,
        transmitted: 0,
        non_processable: 0,
        rejected: 0,
        wip: { done_scan: 0, validation: 0, pdf_conversion: 0, pre_validation: 0 },
        isbns: []
      })
    }

    const { data: scans, error: scansError } = await db
      .from('book_activity')
      .select('id, scan_status, user_flags(rejection_reason), warehouse_scan_at, books!inner(isbn, title, box_id, boxes(box_number))')
      .in('books.box_id', boxIds)
      .order('warehouse_scan_at', { ascending: false })

    if (scansError) throw scansError

    const allScans = scans || []
    const processableScans = allScans.filter(s => s.scan_status === 'processable')
    const nonProcessableScans = allScans.filter(s => s.scan_status === 'non_processable')

    // 3. Fetch Simflex status for all unique processable ISBNs
    const { getSimflexStatusForISBNs } = await import('../services/simflex-db.js')
    const uniqueIsbns = [...new Set(processableScans.map(s => s.books?.isbn))]

    let simflexMap = {}
    if (uniqueIsbns.length > 0) {
      const result = await getSimflexStatusForISBNs(uniqueIsbns)
      if (result.success) {
        for (const r of result.data) {
          simflexMap[r.isbn] = r
        }
      }
    }

    // 4. Build per-ISBN rows
    const isbnRows = allScans.map(s => {
      const isbn = s.books?.isbn
      const sf = simflexMap[isbn] || {}
      const latestStatus = sf.latestStatus || null
      const transmissionCompleted = sf.transmissionCompleted || false
      const transmissionDate = transmissionCompleted ? (sf.latestUpdated || null) : null
      return {
        scan_id: s.id,
        isbn: isbn,
        title: s.books?.title || null,
        scan_status: s.scan_status,
        rejection_reason: s.user_flags?.rejection_reason || null,
        warehouse_scan_at: s.warehouse_scan_at,
        assigned_box_id: s.books?.box_id,
        box_number: s.books?.boxes?.box_number || null,
        simflex_status: latestStatus,
        transmission_completed: transmissionCompleted,
        transmission_date: transmissionDate,
      }
    })

    // 5. Compute WIP breakdown using Simflex stage names
    const WIP_STAGES = {
      done_scan: ['Scanning COMPLETED', 'Scanning ONGOING'],
      pre_validation: ['Preval COMPLETED', 'Preval ONGOING'],
      pdf_conversion: ['Tif2PDF COMPLETED', 'Tif2PDF ONGOING'],
      validation: ['Validate COMPLETED', 'Validate ONGOING'],
    }

    const transmitted = isbnRows.filter(r => r.transmission_completed).length
    const wip = { done_scan: 0, pre_validation: 0, pdf_conversion: 0, validation: 0 }

    for (const r of isbnRows) {
      if (!r.transmission_completed && r.simflex_status) {
        const s = r.simflex_status
        if (s.startsWith('Scanning')) wip.done_scan++
        else if (s.startsWith('Preval')) wip.pre_validation++
        else if (s.startsWith('Tif2PDF')) wip.pdf_conversion++
        else if (s.startsWith('Validate')) wip.validation++
      }
    }

    res.json({
      success: true,
      lot_number: lot.lot_number,
      lot_id: lot.id,
      total: allScans.length,
      processable: processableScans.length,
      transmitted,
      non_processable: nonProcessableScans.length,
      rejected: allScans.filter(s => s.scan_status === 'rejected').length,
      wip,
      isbns: isbnRows,
    })
  } catch (error) {
    console.error('LOT transmission summary error:', error)
    res.status(500).json({ success: false, error: error.message })
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

export default router
