/**
 * routes/scanning.js
 *
 * Exposes live scanning data from Simflex WMS to the frontend.
 * All data is read-only — this route never writes to Simflex.
 *
 * Endpoints:
 *   GET /api/scanning/summary          — Today's totals: scanned / completed / failed / ongoing
 *   GET /api/scanning/data             — Individual scan records for a date range (max 100 rows)
 *   GET /api/scanning/by-machine       — Scan counts grouped by scanner machine
 *   GET /api/scanning/by-stage         — Scan counts grouped by pipeline stage (Preval, Validate, etc.)
 *   GET /api/scanning/live             — Combined live snapshot: summary + by-machine + by-stage + recent scans
 *   GET /api/scanning/ranking          — Scan-user performance ranking for a given date
 *   GET /api/scanning/export           — CSV download of scan data for a date (up to 5000 rows)
 *   GET /api/scanning/simflex-status   — Per-ISBN latest status from Simflex (used by pipeline pages)
 *
 * All routes require authentication (requireAuth middleware).
 */

import express from 'express'
import simflexDb from '../services/simflex-db.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

/**
 * GET /api/scanning/summary
 * Get today's scanning summary (total, completed, failed, ongoing)
 */
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const result = await simflexDb.getTodayScanningSummary()
    res.json(result)
  } catch (error) {
    console.error('Error in /summary:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/data?startDate=2024-04-01&endDate=2024-04-10
 * Get scanning data by date range
 */
router.get('/data', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'startDate and endDate are required' 
      })
    }
    
    const result = await simflexDb.getScanningData(
      new Date(startDate),
      new Date(endDate)
    )
    res.json(result)
  } catch (error) {
    console.error('Error in /data:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/by-machine
 * Get scanning stats grouped by machine/printer
 */
router.get('/by-machine', requireAuth, async (req, res) => {
  try {
    const result = await simflexDb.getScanningByMachine()
    res.json(result)
  } catch (error) {
    console.error('Error in /by-machine:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/by-stage
 * Get scanning stats grouped by stage (Scanning, Validate, PDF Conversion, etc.)
 */
router.get('/by-stage', requireAuth, async (req, res) => {
  try {
    const result = await simflexDb.getScanningByStage()
    res.json(result)
  } catch (error) {
    console.error('Error in /by-stage:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/live
 * Get all live scanning data for today
 */
router.get('/live', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const fromDate = req.query.from || today
    const toDate = req.query.to || today

    const [summary, byMachine, byStage, data, allTime] = await Promise.all([
      simflexDb.getTodayScanningSummary(fromDate, toDate),
      simflexDb.getScanningByMachine(fromDate, toDate),
      simflexDb.getScanningByStage(fromDate, toDate),
      simflexDb.getScanningData(fromDate, toDate),
      simflexDb.getTotalScansAllTime()
    ])

    res.json({
      success: true,
      summary: summary.data,
      byMachine: byMachine.data,
      byStage: byStage.data,
      recentScans: Array.isArray(data.data) ? data.data.slice(0, 200) : [],
      allTimeTotal: allTime.total || 0
    })
  } catch (error) {
    console.error('Error in /live:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/transmitting-boxes?date=2026-06-29
 * Get box-level transmission status from Simflex for today.
 */
router.get('/transmitting-boxes', requireAuth, async (req, res) => {
  try {
    const result = await simflexDb.getTransmittingBoxes(req.query.date)
    res.json(result)
  } catch (error) {
    console.error('Error in /transmitting-boxes:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/transmitting-ongoing?date=2026-06-29
 * Get boxes currently transmitting (Transmission_Archive ONGOING) for today.
 */
router.get('/transmitting-ongoing', requireAuth, async (req, res) => {
  try {
    const result = await simflexDb.getOngoingTransmitBoxes(req.query.date)
    res.json(result)
  } catch (error) {
    console.error('Error in /transmitting-ongoing:', error)
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
