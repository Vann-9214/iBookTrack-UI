/**
 * routes/scanning.js
 *
 * Exposes live scanning data from Simflex WMS to the frontend.
 * All data is read-only — this route never writes to Simflex.
 *
 * Endpoints:
 *   GET /api/scanning/live             — Combined live snapshot: summary + by-machine + by-stage + recent scans
 *   GET /api/scanning/scan-rows        — Raw rows for all scan-stage statuses today (debug modal)
 *   GET /api/scanning/ranking          — Scan-user performance ranking for a given date
 *   GET /api/scanning/export           — CSV download of scan data for a date (up to 5000 rows)
 *   GET /api/scanning/simflex-status   — Per-ISBN latest status from Simflex (used by pipeline pages)
 *
 * All routes require authentication (requireAuth middleware).
 */

import express from 'express'
import simflexDb from '../services/simflex-db.js'
import pipelineCounts from '../services/pipeline-counts.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

/**
 * GET /api/scanning/live
 * Get all live scanning data for today
 */
router.get('/live', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const fromDate = req.query.from || today
    const toDate = req.query.to || today
    const location = req.query.location || 'mustang' // 'mustang' | 'jaguar'
    const newProcessOnly = req.query.newProcessOnly === 'true'

    const [summary, byMachine, byStage, data, allTime, dailyOutput, stageCounts, completedTransmissions, allBooks] = await Promise.all([
      simflexDb.getTodayScanningSummary(fromDate, toDate, location, newProcessOnly),
      simflexDb.getScanningByMachine(fromDate, toDate, location, newProcessOnly),
      simflexDb.getScanningByStage(fromDate, toDate, location, newProcessOnly),
      simflexDb.getScanningData(fromDate, toDate, location, newProcessOnly),
      simflexDb.getTotalScansAllTime(),
      simflexDb.getDailyOutputCount(fromDate === toDate ? fromDate : undefined, location),
      pipelineCounts.getStageCounts(fromDate, toDate),
      simflexDb.getCompletedTransmissionsCount(fromDate, toDate, location, newProcessOnly),
      simflexDb.getAllBooksToday(fromDate, toDate, location, newProcessOnly)
    ])

    // Use the same query as the raw-rows endpoint so the pipeline card
    // count always matches exactly what appears in the modal row list.
    // Only filter by date when the caller explicitly passes a range; otherwise
    // return the full scan-stage dataset so the dashboard matches the modal.
    const scanStageResult = req.query.from && req.query.to
      ? await simflexDb.getScanStageBoxes(fromDate, toDate)
      : await simflexDb.getScanStageBoxes()
    console.log('[/live] getScanStageBoxes result: count=', scanStageResult.count, 'rows=', scanStageResult.data?.length, 'success=', scanStageResult.success, 'error=', scanStageResult.error)
    const scanBooks = scanStageResult.count || 0

    // Scan-pipeline WIP total — matches the Transmission Monitor "New Process Only" figure.
    const SCAN_STAGES = ['Scanning', 'Validate', 'Tif2PDF', 'Preval']
    const scanWipCount = byStage.data?.reduce((sum, s) => {
      return SCAN_STAGES.includes(s.Stage) ? sum + (s.Total || 0) : sum
    }, 0) || 0

    // Distinct ISBNs currently transmitting — ONGOING only, not COMPLETED.
    const transmitStage = (stageCounts.stages || []).find(s => s.stage === 'Transmission_Archive')
    const transmitBooks = transmitStage ? transmitStage.Ongoing : 0

    res.json({
      success: true,
      summary: { ...summary.data, completedTransmissions: completedTransmissions.count || 0 },
      byMachine: byMachine.data,
      byStage: byStage.data,
      recentScans: Array.isArray(data.data) ? data.data.slice(0, 200) : [],
      allTimeTotal: allTime.total || 0,
      dailyOutput: dailyOutput.count || 0,
      scanBooks,
      scanWipCount,
      transmitBooks,
      allBooks: allBooks.books || [],
      totalBooks: allBooks.totalBooks || 0,
      wipCount: allBooks.wipCount || 0,
    })
  } catch (error) {
    console.error('Error in /live:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/scan-rows
 * Raw rows for all scan-stage statuses today (for debug modal).
 */
router.get('/scan-rows', requireAuth, async (req, res) => {
  try {
    const result = await simflexDb.getScanStageBoxes()
    res.json({ success: true, rows: result.data || [], count: result.count })
  } catch (error) {
    console.error('Error in /scan-rows:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/transmit-rows
 * Full Simflex rows for Transmission_Archive ONGOING today (for checkpoint modal).
 * Returns ScanDate, ScanUser, BoxNumber, ISBN, PageCount, Status, Updated.
 */
router.get('/transmit-rows', requireAuth, async (req, res) => {
  try {
    const result = await simflexDb.getTransmitStageRows()
    res.json({ success: true, rows: result.data || [], count: result.count })
  } catch (error) {
    console.error('Error in /transmit-rows:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/ranking?date=2026-04-16
 * Get performance ranking by scan user
 */
router.get('/ranking', requireAuth, async (req, res) => {
  try {
    const result = await simflexDb.getScanningRanking(req.query.date)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/export?date=2026-04-16
 * Get raw scan data as CSV download
 */
router.get('/export', requireAuth, async (req, res) => {
  try {
    const result = await simflexDb.getScanningExportData(req.query.date)
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
    res.setHeader('Content-Disposition', `attachment; filename="scanning-${date}.csv"`)
    res.send(csv)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/scanning/simflex-status?isbns=isbn1,isbn2,...
// Returns per-ISBN latest status from Simflex
router.get('/simflex-status', requireAuth, async (req, res) => {
  try {
    const { isbns } = req.query
    if (!isbns) return res.status(400).json({ success: false, error: 'isbns query param required' })

    const isbnList = String(isbns).split(',').map(s => s.trim()).filter(Boolean)
    if (isbnList.length === 0) return res.json({ success: true, statuses: {} })

    const { getSimflexStatusForISBNs } = await import('../services/simflex-db.js')
    const result = await getSimflexStatusForISBNs(isbnList)

    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error || 'Simflex unavailable' })
    }

    // Build isbn → status map
    const statuses = {}
    for (const r of result.data) {
      statuses[r.isbn] = r.transmissionCompleted ? 'COMPLETED' : (r.latestStatus || 'Pending')
    }

    res.json({ success: true, statuses })
  } catch (error) {
    console.error('Simflex status error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
