import { logger } from '../utils/logger.js'
/**
 * routes/scanning.js
 *
 * Exposes live scanning data from Simflex WMS to the frontend.
 * All data is read-only Ã¢â‚¬â€ this route never writes to Simflex.
 *
 * Endpoints:
 *   GET /api/scanning/live             Ã¢â‚¬â€ Combined live snapshot: summary + by-machine + by-stage + recent scans
 *   GET /api/scanning/scan-rows        Ã¢â‚¬â€ Raw rows for all scan-stage statuses today (debug modal)
 *   GET /api/scanning/ranking          Ã¢â‚¬â€ Scan-user performance ranking for a given date
 *   GET /api/scanning/export           Ã¢â‚¬â€ CSV download of scan data for a date (up to 5000 rows)
 *   GET /api/scanning/simflex-status   Ã¢â‚¬â€ Per-ISBN latest status from Simflex (used by pipeline pages)
 *
 * All routes require authentication (requireAuth middleware).
 */

import express from 'express'
import simflexDb from '../services/simflex-db.js'
import pipelineCounts from '../services/pipeline-counts.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { supabaseAdmin } from '../config/supabase.js'
import { z } from 'zod'

const router = express.Router()

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const baseQuerySchema = {
  query: z.object({
    from: z.string().regex(dateRegex).optional(),
    to: z.string().regex(dateRegex).optional(),
    date: z.string().regex(dateRegex).optional(),
    location: z.enum(['mustang', 'jaguar']).optional(),
    newProcessOnly: z.enum(['true', 'false', '']).optional(),
    wipOnly: z.enum(['true', 'false', '']).optional(),
    machineName: z.string().optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  })
}

/**
 * GET /api/scanning/live
 * Get all live scanning data for today
 */
router.get('/live', requireAuth, validateRequest(baseQuerySchema), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const fromDate = req.query.from || today
    const toDate = req.query.to || today
    const location = req.query.location || 'mustang' // 'mustang' | 'jaguar'
    const newProcessOnly = req.query.newProcessOnly === 'true'
    const wipOnly = req.query.wipOnly === 'true'

    if (wipOnly) {
      const [byStage, stageCounts] = await Promise.all([
        simflexDb.getScanningByStage(fromDate, toDate, location, newProcessOnly),
        pipelineCounts.getStageCounts(fromDate, toDate, location),
      ])

      const SCAN_STAGES = ['Scanning', 'Jaguar Validate', 'Tif2PDF', 'Preval']
      const scanWipCount = byStage.data?.reduce((sum, s) => {
        return SCAN_STAGES.includes(s.Stage) ? sum + (s.Total || 0) : sum
      }, 0) || 0

      const transmitStage = (stageCounts.stages || []).find(s => s.stage === 'Transmission_Archive')
      const transmitBooks = transmitStage ? transmitStage.Ongoing : 0

      return res.json({
        success: true,
        scanWipCount,
        transmitBooks,
      })
    }

    const [summary, byMachine, byStage, data, allTime, dailyOutput, stageCounts, completedTransmissions, allBooks] = await Promise.all([
      simflexDb.getTodayScanningSummary(fromDate, toDate, location, newProcessOnly),
      simflexDb.getScanningByMachine(fromDate, toDate, location, newProcessOnly),
      simflexDb.getScanningByStage(fromDate, toDate, location, newProcessOnly),
      simflexDb.getScanningData(fromDate, toDate, location, newProcessOnly),
      simflexDb.getTotalScansAllTime(),
      simflexDb.getDailyOutputCount(fromDate === toDate ? fromDate : undefined, location),
      pipelineCounts.getStageCounts(fromDate, toDate, location),
      simflexDb.getCompletedTransmissionsCount(fromDate, toDate, location, newProcessOnly),
      simflexDb.getAllBooksToday(fromDate, toDate, location, newProcessOnly)
    ])

    // Use the same query as the raw-rows endpoint so the pipeline card
    // count always matches exactly what appears in the modal row list.
    // Only filter by date when the caller explicitly passes a range; otherwise
    // return the full scan-stage dataset so the dashboard matches the modal.
    const scanStageResult = req.query.from && req.query.to
      ? await simflexDb.getScanStageBoxes(fromDate, toDate, location)
      : await simflexDb.getScanStageBoxes(undefined, undefined, location)
    logger.info('[/live] getScanStageBoxes result: count=', scanStageResult.count, 'rows=', scanStageResult.data?.length, 'success=', scanStageResult.success, 'error=', scanStageResult.error)
    const scanBooks = scanStageResult.count || 0

    // Scan-pipeline WIP total Ã¢â‚¬â€ matches the Transmission Monitor "New Process Only" figure.
    const SCAN_STAGES = ['Scanning', 'Jaguar Validate', 'Tif2PDF', 'Preval']
    const scanWipCount = byStage.data?.reduce((sum, s) => {
      return SCAN_STAGES.includes(s.Stage) ? sum + (s.Total || 0) : sum
    }, 0) || 0

    // Distinct ISBNs currently transmitting Ã¢â‚¬â€ ONGOING only, not COMPLETED.
    const transmitStage = (stageCounts.stages || []).find(s => s.stage === 'Transmission_Archive')
    const transmitBooks = transmitStage ? transmitStage.Ongoing : 0

    // Replace Simflex BoxNumber with Supabase Box and Lot for both allBooks and recentScans
    let processedAllBooks = allBooks.books || []
    let processedRecentScans = Array.isArray(data.data) ? data.data.slice(0, 200) : []
    
    const allIsbns = new Set([
      ...processedAllBooks.map(b => b.ISBN),
      ...processedRecentScans.map(b => b.ISBN)
    ].filter(Boolean))

    if (allIsbns.size > 0) {
      const isbns = Array.from(allIsbns)
      const chunkSize = 200
      const supabaseMap = {}
      for (let i = 0; i < isbns.length; i += chunkSize) {
        const chunk = isbns.slice(i, i + chunkSize)
        const { data: dbBooks, error } = await supabaseAdmin
          .from('books')
          .select('isbn, box:boxes(box_number, lot:lots(lot_number))')
          .in('isbn', chunk)
        if (error) {
          logger.error("Supabase Error fetching lot/box:", error);
        }
        if (dbBooks && dbBooks.length > 0) {
          for (const b of dbBooks) {
            // Check if box is an array or object
            const boxObj = Array.isArray(b.box) ? b.box[0] : b.box;
            const lotObj = boxObj && Array.isArray(boxObj.lot) ? boxObj.lot[0] : (boxObj?.lot || null);
            supabaseMap[b.isbn] = {
              box: boxObj?.box_number || '—',
              lot: lotObj?.lot_number || '—'
            }
          }
        }
      }
      processedAllBooks = processedAllBooks.map(b => ({
        ...b,
        BoxNumber: supabaseMap[b.ISBN]?.box || '—',
        LotNumber: supabaseMap[b.ISBN]?.lot || '—'
      }))
      processedRecentScans = processedRecentScans.map(b => ({
        ...b,
        BoxNumber: supabaseMap[b.ISBN]?.box || '—',
        LotNumber: supabaseMap[b.ISBN]?.lot || '—'
      }))
    }

    res.json({
      success: true,
      summary: { ...summary.data, completedTransmissions: completedTransmissions.count || 0 },
      byMachine: byMachine.data,
      byStage: byStage.data,
      recentScans: processedRecentScans,
      allTimeTotal: allTime.total || 0,
      dailyOutput: dailyOutput.count || 0,
      scanBooks,
      scanWipCount,
      transmitBooks,
      allBooks: processedAllBooks,
      totalBooks: allBooks.totalBooks || 0,
      wipCount: allBooks.wipCount || 0,
      limitReached: allBooks.limitReached || false,
    })
  } catch (error) {
    logger.error('Error in /live:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/scan-rows
 * Raw rows for all scan-stage statuses today (for debug modal).
 */
router.get('/scan-rows', requireAuth, validateRequest(baseQuerySchema), async (req, res) => {
  try {
    const location = req.query.location || 'mustang'
    const result = await simflexDb.getScanStageBoxes(undefined, undefined, location)
    res.json({ success: true, rows: result.data || [], count: result.count })
  } catch (error) {
    logger.error('Error in /scan-rows:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/transmit-rows
 * Books currently in Transmission_Archive ONGOING, cross-referenced against
 * the iBookTrack DB.
 *
 * Rules:
 *   1. Start from Simflex ISBNs with status = 'Transmission_Archive ONGOING'.
 *   2. Only keep ISBNs that exist in our `books` table.
 *   3. Only keep those whose box has current_stage = 'scan'. In the checkpoint
 *      UI the Transmit card shows scan-stage boxes whose books are actively
 *      transmitting -- boxes do NOT change stage until Simflex is done.
 *   4. Box number and lot number come from the DB (authoritative).
 *      The DB value already includes the word e.g. "Lot 1", so no extra
 *      prefix is added.
 */
router.get('/transmit-rows', requireAuth, async (req, res) => {
  try {
    const location = req.query.location || 'mustang'

    // Convert location ('mustang'|'jaguar') to box_type ('Mustang'|'Jaguar')
    // so the DB filter correctly separates the two brands.
    const boxType = location.charAt(0).toUpperCase() + location.slice(1).toLowerCase()

    // 1. Fetch raw Simflex rows for this location (Transmission_Archive ONGOING today)
    const simResult = await simflexDb.getTransmitStageRows(location)
    const simRows = simResult.data || []

    if (simRows.length === 0) {
      return res.json({ success: true, rows: [], count: 0 })
    }

    // 2. Collect unique ISBNs from Simflex
    const simflexIsbns = [...new Set(simRows.map(r => String(r.ISBN || '').trim()).filter(Boolean))]

    // 3. Query our DB: books matching these ISBNs, with two hard filters:
    //    a) boxes.current_stage = 'scan'  (Transmit UI card = scan-stage boxes)
    //    b) boxes.box_type     = boxType  (brand isolation: Mustang vs Jaguar)
    const { supabaseAdmin } = await import('../config/supabase.js')
    const { data: dbBooks, error: dbError } = await supabaseAdmin
      .from('books')
      .select('id, isbn, title, boxes!inner(box_number, current_stage, box_type, lot:lots(lot_number))')
      .in('isbn', simflexIsbns)
      .eq('boxes.current_stage', 'scan')
      .eq('boxes.box_type', boxType)

    if (dbError) throw dbError

    if (!dbBooks || dbBooks.length === 0) {
      return res.json({ success: true, rows: [], count: 0 })
    }

    // 4. Non-processable protection: fetch scan_status from book_activity for
    //    these books and exclude any that are flagged non_processable.
    //    (Non-processable books should not appear in Simflex, but just in case.)
    const bookIds = dbBooks.map(b => b.id).filter(Boolean)
    const { data: activities } = await supabaseAdmin
      .from('book_activity')
      .select('book_id, scan_status')
      .in('book_id', bookIds)

    // Build a set of book IDs confirmed to be processable
    const processableIds = new Set(
      (activities || [])
        .filter(a => a.scan_status === 'processable')
        .map(a => a.book_id)
    )

    // 5. Build lookup: isbn -> { box_number, lot_number, title }
    //    lot_number already contains the full label (e.g. "Lot 1") -- no extra prefix.
    const dbLookup = {}
    for (const book of dbBooks) {
      // Skip if not confirmed processable
      if (!processableIds.has(book.id)) continue
      const box = book.boxes
      if (!box) continue
      dbLookup[book.isbn] = {
        title: book.title || null,
        box_number: box.box_number,
        lot_number: box.lot?.lot_number || null,
      }
    }

    // 6. Merge: keep only Simflex rows that passed all DB validations, deduped by ISBN
    const enrichedRows = []
    const seenIsbns = new Set()
    for (const row of simRows) {
      const isbn = String(row.ISBN || '').trim()
      if (!isbn || seenIsbns.has(isbn)) continue
      const dbInfo = dbLookup[isbn]
      if (!dbInfo) continue  // Not in our DB, wrong brand, wrong stage, or non-processable
      seenIsbns.add(isbn)
      enrichedRows.push({
        ISBN: isbn,
        BoxNumber: dbInfo.box_number,
        LotNumber: dbInfo.lot_number,
        Title: dbInfo.title,
        Status: row.Status,
        ScanUser: row.ScanUser,
        ScanDate: row.ScanDate,
        PageCount: row.PageCount,
        Updated: row.Updated,
      })
    }

    res.json({ success: true, rows: enrichedRows, count: enrichedRows.length })
  } catch (error) {
    logger.error('Error in /transmit-rows:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/machine-books', requireAuth, async (req, res) => {
  try {
    const machine = String(req.query.machine || '').trim()
    if (!machine) return res.status(400).json({ success: false, error: 'machine query param required' })

    const result = await simflexDb.getBooksByMachine(
      req.query.from,
      req.query.to,
      machine,
      req.query.location || 'mustang',
      req.query.newProcessOnly === 'true'
    )
    if (!result.success) return res.status(502).json(result)
    res.json(result)
  } catch (error) {
    logger.error('Error in /machine-books:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/ranking?date=2026-04-16
 * Get performance ranking by scan user
 */
router.get('/ranking', requireAuth, validateRequest(baseQuerySchema), async (req, res) => {
  try {
    const location = req.query.location || 'mustang'
    const result = await simflexDb.getScanningRanking(req.query.date, location)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/export?date=2026-04-16
 * Get raw scan data as CSV download
 */
router.get('/export', requireAuth, validateRequest(baseQuerySchema), async (req, res) => {
  try {
    const location = req.query.location || 'mustang'
    const result = await simflexDb.getScanningExportData(req.query.date, location)
    if (!result.success) return res.status(500).json(result)
    const rows = result.data
    const headers = ['ScanDate', 'ScanUser', 'BoxNumber', 'ISBN', 'PageCount', 'Status', 'Machine', 'Updated']
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const v = r[h] ?? ''
        return `"${String(v).replace(/"/g, '""')}"`
      }).join(','))
    ].join('\r\n')
    const date = req.query.date || new Date().toISOString().split('T')[0]
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="scanning-${date}-${location}.csv"`)
    res.send(csv)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/scanning/simflex-status?isbns=isbn1,isbn2,...
// Returns per-ISBN latest status from Simflex
router.get('/simflex-status', requireAuth, validateRequest({
  query: z.object({
    isbns: z.string().optional(),
    location: z.enum(['mustang', 'jaguar']).optional()
  })
}), async (req, res) => {
  try {
    const { isbns } = req.query
    const location = req.query.location || 'mustang'
    if (!isbns) return res.status(400).json({ success: false, error: 'isbns query param required' })

    const isbnList = String(isbns).split(',').map(s => s.trim()).filter(Boolean)
    if (isbnList.length === 0) return res.json({ success: true, statuses: {} })

    const { getSimflexStatusForISBNs } = await import('../services/simflex-db.js')
    const result = await getSimflexStatusForISBNs(isbnList, location)

    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error || 'Simflex unavailable' })
    }

    const statuses = {}
    for (const r of result.data) {
      statuses[r.isbn] = r.latestStatus || 'Pending'
    }

    // Sync transmission_status to book_activity in Supabase
    if (Object.keys(statuses).length > 0) {
      // Fetch books to get their IDs
      const { data: booksData } = await supabaseAdmin
        .from('books')
        .select('id, isbn')
        .in('isbn', isbnList)
        
      if (booksData && booksData.length > 0) {
        // Prepare promises to update book_activity
        const updatePromises = booksData.map(book => {
          const stat = statuses[book.isbn]
          if (stat) {
            return supabaseAdmin
              .from('book_activity')
              .update({ transmission_status: stat })
              .eq('book_id', book.id)
          }
          return null
        }).filter(Boolean)
        
        await Promise.all(updatePromises)
      }
    }

    res.json({ success: true, statuses })
  } catch (error) {
    logger.error('Simflex status error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/scanning/enrich-ilms
 * Enrich a list of ISBNs with ILMS Box and Lot data, saving to Supabase
 */
router.post('/enrich-ilms', requireAuth, async (req, res) => {
  try {
    const { isbns } = req.body
    if (!Array.isArray(isbns) || isbns.length === 0) {
      return res.json({ success: true, enriched: {} })
    }

    // Limit to max 100 per request just in case
    const safeIsbns = isbns.slice(0, 100)
    const { ilmsApi } = await import('../services/ilms-api.js')

    const results = await Promise.all(
      safeIsbns.map(async (isbn) => {
        const result = await ilmsApi.searchBookByISBN(isbn)
        return { isbn, ...result }
      })
    )

    const enriched = {}

    for (const r of results) {
      if (r.success && r.data) {
        const boxNumber = r.data.BoxNo
        const lotNumber = r.data.LotNo
        const title = r.data.Title || 'Unknown'
        
        enriched[r.isbn] = { box: boxNumber || '—', lot: lotNumber || '—' }
      } else {
        enriched[r.isbn] = { box: '—', lot: '—' }
      }
    }

    res.json({ success: true, enriched })
  } catch (error) {
    logger.error('ILMS enrichment error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
