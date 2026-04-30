import express from 'express'
import simflexDb from '../services/simflex-db.js'

const router = express.Router()

/**
 * GET /api/scanning/summary
 * Get today's scanning summary (total, completed, failed, ongoing)
 */
router.get('/summary', async (req, res) => {
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
router.get('/data', async (req, res) => {
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
router.get('/by-machine', async (req, res) => {
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
router.get('/by-stage', async (req, res) => {
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
router.get('/live', async (req, res) => {
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
      recentScans: data.data?.slice(0, 200),
      allTimeTotal: allTime.total || 0
    })
  } catch (error) {
    console.error('Error in /live:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/scanning/ranking?date=2026-04-16
 * Get performance ranking by scan user
 */
router.get('/ranking', async (req, res) => {
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
router.get('/export', async (req, res) => {
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

export default router
