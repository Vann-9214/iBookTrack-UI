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
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))
    
    const [summary, byMachine, byStage, data] = await Promise.all([
      simflexDb.getTodayScanningSummary(),
      simflexDb.getScanningByMachine(),
      simflexDb.getScanningByStage(),
      simflexDb.getScanningData(startOfDay, endOfDay)
    ])
    
    res.json({
      success: true,
      summary: summary.data,
      byMachine: byMachine.data,
      byStage: byStage.data,
      recentScans: data.data?.slice(0, 50) // Latest 50 scans
    })
  } catch (error) {
    console.error('Error in /live:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
