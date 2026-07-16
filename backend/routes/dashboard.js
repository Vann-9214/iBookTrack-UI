/**
 * routes/dashboard.js
 *
 * Provides aggregated statistics for the main dashboard.
 *
 * Endpoints:
 *   GET /api/dashboard/stats          — Summary counts: boxes, books, transmitted, QC flags, active lots
 *                                       Supports optional filtering by lot_number or lot range
 *   GET /api/dashboard/open-lots      — Open lots with box/book stats and completion progress
 *   GET /api/dashboard/qc-flags       — List of all open QC flags (books flagged for issues)
 *   GET /api/dashboard/daily-output   — Today's completed transmissions from Simflex
 *   GET /api/dashboard/lot-details/:lot_number — Stage breakdown and book status counts for a lot
 *   GET /api/dashboard/pipeline-stats — Pipeline stage counts grouped by box type
 *
 * All routes require authentication (requireAuth middleware).
 */

import express from 'express'
import { supabase, supabaseAdmin } from '../config/supabase.js'
import simflexDb from '../services/simflex-db.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { z } from 'zod'
import { validateRequest } from '../middleware/validateRequest.js'

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

// Get dashboard stats
router.get('/stats', requireAuth, validateRequest({
  query: z.object({
    lot_number: z.string().optional(),
    lot_range_start: z.string().optional(),
    lot_range_end: z.string().optional(),
    box_type: z.string().optional()
  })
}), async (req, res) => {
  try {
    const { lot_number, lot_range_start, lot_range_end, box_type } = req.query
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
    if (box_type) boxQuery = boxQuery.eq('box_type', box_type.charAt(0).toUpperCase() + box_type.slice(1).toLowerCase())
    const { count: totalBoxes } = await boxQuery

    // Get total books
    let bookQuery = db.from('books').select('id', { count: 'exact', head: true })
    
    let boxesFilterQuery = db.from('boxes').select('id')
    if (lotIds) boxesFilterQuery = boxesFilterQuery.in('lot_id', lotIds)
    if (box_type) boxesFilterQuery = boxesFilterQuery.eq('box_type', box_type.charAt(0).toUpperCase() + box_type.slice(1).toLowerCase())
    
    if (lotIds || box_type) {
      const { data: boxes } = await boxesFilterQuery
      if (boxes && boxes.length > 0) {
        bookQuery = bookQuery.in('box_id', boxes.map(b => b.id))
      } else {
        // If filters yielded no boxes, then books should be 0
        bookQuery = bookQuery.eq('id', '00000000-0000-0000-0000-000000000000') // forcing empty result
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

    // Today UTC range
    const now = new Date()
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
    const startIso = startOfDay.toISOString()
    const endIso = endOfDay.toISOString()

    // Get flagged books count from user_flags (always use admin to bypass RLS)
    // Count only flags that were created/updated today
    const adminDb = supabaseAdmin || db
    let unaccountedQuery = adminDb
      .from('user_flags')
      .select(`
        id,
        book_activity!inner(
          books!inner(
            boxes!inner(
              box_type
            )
          )
        )
      `, { count: 'exact', head: true })
      .or(`and(warehouse_flag_at.gte.${startIso},warehouse_flag_at.lt.${endIso}),and(inventory_flag_at.gte.${startIso},inventory_flag_at.lt.${endIso}),and(endorsement_flag_at.gte.${startIso},endorsement_flag_at.lt.${endIso})`)

    if (box_type) {
      const normalizedBoxType = box_type.charAt(0).toUpperCase() + box_type.slice(1).toLowerCase()
      unaccountedQuery = unaccountedQuery
        .eq('book_activity.books.boxes.box_type', normalizedBoxType)
    }

    const { count: unaccountedBooks, error: flagCountError } = await unaccountedQuery
    if (flagCountError) console.warn('user_flags count error:', flagCountError.message)

    // Get active lots count
    // A lot is considered "active" (open) if it has at least one box that is NOT in the 'storage' stage.
    let activeLots = 0
    if (!lot_number && !lot_range_start) {
      // Fetch all lots and their boxes' current_stage
      const { data: lotsWithBoxes } = await db
        .from('lots')
        .select('id, type, boxes(current_stage)')
      
      if (lotsWithBoxes) {
        activeLots = lotsWithBoxes.filter(lot => {
          // If a box_type (brand) filter is applied, only consider lots of that brand
          if (box_type) {
            const normalizedBrand = box_type.charAt(0).toUpperCase() + box_type.slice(1).toLowerCase();
            if (lot.type !== normalizedBrand) return false;
          }
          if (!lot.boxes || lot.boxes.length === 0) return true // Empty lot is active
          // Lot is active if any box is NOT in 'storage' stage
          return lot.boxes.some(b => b.current_stage !== 'storage')
        }).length
      }
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
router.get('/open-lots', requireAuth, validateRequest({
  query: z.object({
    location: z.enum(['mustang', 'jaguar']).optional()
  })
}), async (req, res) => {
  try {
    const { brand } = req.query;
    const db = supabaseAdmin || supabase

    // Build query for lots
    let lotsQuery = db
      .from('lots')
      .select(`
        id, 
        lot_number,
        type,
        boxes (
          id,
          current_stage,
          total_books_expected,
          books_transmitted
        )
      `)
      .order('created_at', { ascending: false });

    if (brand) {
      const normalizedBrand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
      lotsQuery = lotsQuery.eq('type', normalizedBrand);
    }

    const { data: lots, error: lotsError } = await lotsQuery;

    if (lotsError) throw lotsError
    if (!lots || lots.length === 0) {
      return res.json({ success: true, lots: [] })
    }

    const openLots = lots.filter(lot => {
      // Lot is open if it has no boxes, or at least one box is NOT in 'storage' stage
      if (!lot.boxes || lot.boxes.length === 0) return true;
      return lot.boxes.some(b => b.current_stage !== 'storage');
    });

    const formattedLots = openLots.map(lot => {
      const boxes = lot.boxes || [];
      const totalBoxes = boxes.length;
      let totalBooks = 0;
      let lotBoxProgressSum = 0;
      
      // Determine overall lot status based on boxes (mirroring report function)
      let lotStatus = 'Open';
      if (totalBoxes > 0) {
        const PIPELINE_STAGES = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit'];
        const activeBoxes = boxes.filter(b => PIPELINE_STAGES.includes(b.current_stage));
        
        if (activeBoxes.length > 0) {
          lotStatus = 'In Progress';
        }
      }

      boxes.forEach(box => {
        totalBooks += (box.total_books_expected || 0);
        
        // Progress percentage based on stage, mimicking reports function
        const stages = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit', 'storage'];
        const sIndex = stages.indexOf(box.current_stage || '');
        let boxProgress = sIndex >= 0 ? 10 + Math.round((sIndex / (stages.length - 1)) * 90) : 0;
        
        if (box.current_stage === 'storage') {
          boxProgress = 100;
        }
        
        lotBoxProgressSum += boxProgress;
      });

      const completionProgress = totalBoxes > 0
        ? Math.round(lotBoxProgressSum / totalBoxes)
        : 0;

      return {
        id: lot.id,
        lot_number: lot.lot_number,
        total_boxes: totalBoxes,
        total_books: totalBooks,
        status: lotStatus,
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
router.get('/qc-flags', requireAuth, validateRequest({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    today: z.enum(['true', 'false']).optional(),
    box_type: z.string().optional()
  })
}), async (req, res) => {
  try {
    const db = supabaseAdmin || supabase
    const requestedPage = parseInt(req.query.page || '1', 10)
    const requestedLimit = parseInt(req.query.limit || '50', 10)
    const todayOnly = req.query.today === 'true'
    const boxType = req.query.box_type ?
      req.query.box_type.charAt(0).toUpperCase() + req.query.box_type.slice(1).toLowerCase() : null
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50
    const start = (page - 1) * limit
    const end = start + limit - 1

    let query = db
      .from('user_flags')
      .select(`
        id,
        book_activity_id,
        rejection_reason,
        notes,
        warehouse_flag_by,
        warehouse_flag_at,
        inventory_flag_by,
        inventory_flag_at,
        endorsement_flag_by,
        endorsement_flag_at,
        warehouse_user:profiles!warehouse_flag_by(name),
        inventory_user:profiles!inventory_flag_by(name),
        endorsement_user:profiles!endorsement_flag_by(name),
        book_activity(
          id,
          books(
            isbn,
            title,
            boxes(
              box_number,
              box_type,
              lot:lots(lot_number)
            )
          )
        )
      `, { count: 'exact' })

    if (boxType) {
      query = query.eq('book_activity.books.boxes.box_type', boxType)
    } else {
      query = query.in('book_activity.books.boxes.box_type', ['Mustang', 'Jaguar'])
    }

    if (todayOnly) {
      const now = new Date()
      const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
      const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
      const startIso = startOfDay.toISOString()
      const endIso = endOfDay.toISOString()
      query = query.or(`and(warehouse_flag_at.gte.${startIso},warehouse_flag_at.lt.${endIso}),and(inventory_flag_at.gte.${startIso},inventory_flag_at.lt.${endIso}),and(endorsement_flag_at.gte.${startIso},endorsement_flag_at.lt.${endIso})`)
    }

    const { data, error, count } = await query
      .order('warehouse_flag_at', { ascending: false })
      .range(start, end)
    if (error) throw error

    const firstRel = (rel) => Array.isArray(rel) ? rel[0] : rel

    const mappedFlags = (data || []).map(f => {
      const ba = firstRel(f.book_activity) || {}
      const book = firstRel(ba.books) || {}
      const box = firstRel(book.boxes) || {}
      const lot = firstRel(box.lot) || {}

      const flagCandidates = [
        { at: f.warehouse_flag_at, by: firstRel(f.warehouse_user)?.name },
        { at: f.inventory_flag_at, by: firstRel(f.inventory_user)?.name },
        { at: f.endorsement_flag_at, by: firstRel(f.endorsement_user)?.name },
      ].filter(c => c.at)

      const latestFlag = flagCandidates.sort(
        (a, b) => new Date(b.at) - new Date(a.at)
      )[0]

      return {
        scan_id: f.id,
        isbn: book.isbn || null,
        title: book.title || null,
        issue: f.rejection_reason,
        remarks: f.notes,
        flagged_at: latestFlag?.at || f.warehouse_flag_at || null,
        flagged_by_name: latestFlag?.by || null,
        assigned_box: box.box_number
          ? { box_number: box.box_number, box_type: box.box_type || null, lot: lot.lot_number ? { lot_number: lot.lot_number } : null }
          : null,
      }
    })

    res.json({ success: true, flags: mappedFlags, total: count || 0, page, limit })
  } catch (error) {
    console.error('Get QC flags error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get today's completed transmissions (Daily Output list)
router.get('/daily-output', requireAuth, validateRequest({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    brand: z.string().optional()
  })
}), async (req, res) => {
  try {
    const db = supabaseAdmin || supabase
    const requestedPage = parseInt(req.query.page || '1', 10)
    const requestedLimit = parseInt(req.query.limit || '50', 10)
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50

    const userBrand = req.query.brand === 'jaguar' ? 'jaguar' : req.user?.user_metadata?.brand === 'jaguar' ? 'jaguar' : 'mustang'
    const location = userBrand

    const { success, rows: simflexRows } = await simflexDb.getDailyOutputRows(undefined, location, true)
    if (!success) {
      return res.status(502).json({ error: 'Failed to fetch daily output from Simflex' })
    }

    // Enrich Simflex rows with local book data (title + lot/box via books -> boxes -> lots)
    const isbns = (simflexRows || []).map(r => r.isbn).filter(Boolean)
    let booksByIsbn = {}
    if (isbns.length > 0) {
      const { data: books } = await db
        .from('books')
        .select('isbn, title, box:boxes(box_number, lot:lots(lot_number))')
        .in('isbn', isbns)
      const firstRel = (rel) => Array.isArray(rel) ? rel[0] : rel
      ;(books || []).forEach(b => {
        const box = firstRel(b.box) || {}
        const lot = firstRel(box.lot) || {}
        booksByIsbn[b.isbn] = {
          title: b.title || null,
          box_number: box.box_number || null,
          lot_number: lot.lot_number || null,
        }
      })
    }

    const enrichedRows = (simflexRows || []).map(r => {
      const local = booksByIsbn[r.isbn] || {}
      return {
        isbn: r.isbn,
        title: local.title || null,
        box_number: local.box_number || r.box_number || '—',
        lot_number: local.lot_number || '—',
        scan_user: r.scan_user || '—',
        page_count: r.page_count || 0,
        completed_at: r.updated,
      }
    })

    const total = enrichedRows.length
    const start = (page - 1) * limit
    const paginatedRows = enrichedRows.slice(start, start + limit)

    res.json({ success: true, rows: paginatedRows, total, page, limit })
  } catch (error) {
    console.error('Get daily output error:', error)
    res.status(500).json({ error: error.message })
  }
})


// Get enhanced lot details — stage breakdown, book status counts, completion progress
router.get('/lot-details/:lot_number', requireAuth, validateRequest({
  params: z.object({
    lot_number: z.string().min(1)
  })
}), async (req, res) => {
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

    // Fetch all boxes for this lot (with embedded book count)
    const { data: boxes, error: boxesError } = await db
      .from('boxes')
      .select('id, current_stage, total_books_expected, books:books(count)')
      .eq('lot_id', lot.id)
      .order('box_number')
    if (boxesError) throw boxesError

    const boxIds = (boxes || []).map(b => b.id)
    const boxById = {}
    ;(boxes || []).forEach(box => { boxById[box.id] = box })

    // Stage breakdown from boxes
    const stageBreakdown = {}
    let totalBooks = 0
    ;(boxes || []).forEach(box => {
      stageBreakdown[box.current_stage] = (stageBreakdown[box.current_stage] || 0) + 1
      totalBooks += (box.books?.[0]?.count || 0)
    })

    // Book status counts from scans
    let processable = 0, nonProcessable = 0, transmitted = 0
    if (boxIds.length > 0) {
      const { data: activity, error: activityError } = await db
        .from('book_activity')
        .select('scan_status, books!inner(box_id)')
        .in('books.box_id', boxIds)

      if (activityError) throw activityError

      ;(activity || []).forEach(a => {
        const boxStage = boxById[a.books?.box_id]?.current_stage
        if (a.scan_status === 'processable') {
          processable++
          if (boxStage === 'storage') transmitted++
        } else if (a.scan_status === 'non_processable') {
          nonProcessable++
        }
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

// Get pipeline stage counts (today only, grouped by box_type)
router.get('/pipeline-stats', requireAuth, validateRequest({
  query: z.object({
    lot_number: z.string().optional(),
    brand: z.string().optional()
  })
}), async (req, res) => {
  try {
    const { lot_number, brand } = req.query
    const selectedBrand = (brand === 'jaguar' || brand === 'mustang') ? brand : null
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

    // Today range in UTC
    const now = new Date()
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
    const startIso = startOfDay.toISOString()
    const endIso = endOfDay.toISOString()

    // Active Pipeline reflects boxes CREATED today and their CURRENT stage.
    let query = db
      .from('boxes')
      .select('id, current_stage, box_type')
      .gte('created_at', startIso)
      .lt('created_at', endIso)
    if (lotId) query = query.eq('lot_id', lotId)

    const { data: boxes, error: boxesError } = await query
    if (boxesError) throw boxesError

    const stageCountsByType = {
      warehouse:   { mustang: 0, jaguar: 0, total: 0 },
      inventory:   { mustang: 0, jaguar: 0, total: 0 },
      cut:         { mustang: 0, jaguar: 0, total: 0 },
      endorsement: { mustang: 0, jaguar: 0, total: 0 },
      storage:     { mustang: 0, jaguar: 0, total: 0 }
    }

    ;(boxes || []).forEach(box => {
      const stage = box.current_stage
      if (!stageCountsByType[stage]) return
      const type = (box.box_type || '').toString().toLowerCase()
      const normalizedType = type === 'jaguar' ? 'jaguar' : 'mustang'
      stageCountsByType[stage][normalizedType]++
      stageCountsByType[stage].total++
    })

    // Flat totals filtered by the selected brand when provided
    const stageCounts = {
      warehouse:   selectedBrand ? stageCountsByType.warehouse[selectedBrand] : stageCountsByType.warehouse.total,
      inventory:   selectedBrand ? stageCountsByType.inventory[selectedBrand] : stageCountsByType.inventory.total,
      cut:         selectedBrand ? stageCountsByType.cut[selectedBrand] : stageCountsByType.cut.total,
      endorsement: selectedBrand ? stageCountsByType.endorsement[selectedBrand] : stageCountsByType.endorsement.total,
      storage:     selectedBrand ? stageCountsByType.storage[selectedBrand] : stageCountsByType.storage.total,
      scan:        0,
      transmit:    0
    }

    // Scan and Transmit stages are driven by live Simflex status, filtered by brand/location
    try {
      const location = selectedBrand || 'mustang'
      const [scanResult, transmitResult] = await Promise.all([
        simflexDb.getScanStageBoxes(undefined, undefined, location),
        simflexDb.getTransmitStageBoxes(undefined, undefined, location),
      ])
      stageCounts.scan = scanResult.success ? scanResult.count : 0
      stageCounts.transmit = transmitResult.success ? transmitResult.count : 0
    } catch (simflexError) {
      console.warn('Simflex stage count failed:', simflexError.message)
      stageCounts.scan = 0
      stageCounts.transmit = 0
    }

    res.json({ stageCounts, stageCountsByType, today: startIso.split('T')[0] })
  } catch (error) {
    console.error('Get pipeline stats error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
