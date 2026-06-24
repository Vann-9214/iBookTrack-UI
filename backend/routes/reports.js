import express from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = express.Router()

// Helper to call RPC with retry logic
async function callRpcWithRetry(funcName, params = {}, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Reports] Calling ${funcName} (attempt ${attempt + 1}/${maxRetries + 1})...`)
      
      // Create timeout promise (45 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Client timeout after 45s for ${funcName}`)), 45000)
      )
      
      const rpcPromise = supabaseAdmin.rpc(funcName, params, { count: 'exact' })
      
      const result = await Promise.race([rpcPromise, timeoutPromise])
      
      // Check if the Supabase response contains an error
      if (result.error) {
        const errorMsg = result.error?.message || JSON.stringify(result.error)
        console.error(`[Reports] ${funcName} attempt ${attempt + 1} returned error: ${errorMsg}`)
        
        // If it's a timeout error, retry. Otherwise, fail immediately
        if (errorMsg.includes('timeout') || errorMsg.includes('57014')) {
          if (attempt === maxRetries) {
            throw result.error
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          continue
        } else {
          throw result.error
        }
      }
      
      console.log(`[Reports] ${funcName} succeeded on attempt ${attempt + 1}`)
      return result
    } catch (error) {
      console.error(`[Reports] ${funcName} attempt ${attempt + 1} failed:`, error?.message)
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
}

/**
 * GET /api/reports/finished-lots
 * Get statistics for finished lots (Lot 1-51) from imported_books_staging
 */
router.get('/finished-lots', async (req, res) => {
  try {
    console.log('[Reports] fetching finished-lots...')
    
    const { data: lotData, error: lotError } = await callRpcWithRetry('get_lot_stats', {}, 0)

    if (lotError) {
      console.error('[Reports] get_lot_stats RPC error after retries:', lotError)
      // Return empty data gracefully rather than crashing
      return res.json({ overview: { totalBooks: 0, transmitted: 0, rejected: 0, booksToGo: 0, completionRate: '0' }, lotBreakdown: [], vendorBreakdown: [] })
    }
    
    console.log('[Reports] got', lotData?.length || 0, 'lot records')

    const lotBreakdown = (lotData || []).filter(lot =>
      /^Lot-\d{1,3}M?$/i.test(lot.lot)
    ).sort((a, b) => {
      const numA = parseInt(a.lot.match(/\d+/)?.[0] || '0')
      const numB = parseInt(b.lot.match(/\d+/)?.[0] || '0')
      return numA - numB
    })

    // Derive overview totals from RPC results — no separate COUNT queries needed
    const safeTotal = lotBreakdown.reduce((s, l) => s + Number(l.total || 0), 0)
    const safeTransmitted = lotBreakdown.reduce((s, l) => s + Number(l.transmitted || 0), 0)
    const safeRejected = lotBreakdown.reduce((s, l) => s + Number(l.rejected || 0), 0)
    const booksToGo = safeTotal - safeTransmitted

    res.json({
      overview: {
        totalBooks: safeTotal,
        transmitted: safeTransmitted,
        rejected: safeRejected,
        booksToGo,
        completionRate: safeTotal ? ((safeTransmitted / safeTotal) * 100).toFixed(2) : '0'
      },
      lotBreakdown,
      vendorBreakdown: []
    })
  } catch (error) {
    console.error('[Reports] Error fetching finished lots report:', {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      details: error?.details,
      fullError: error
    })
    // Return empty data on catch as well
    res.json({ overview: { totalBooks: 0, transmitted: 0, rejected: 0, booksToGo: 0, completionRate: '0' }, lotBreakdown: [], vendorBreakdown: [] })
  }
})

/**
 * GET /api/reports/chart-data
 * Get chart data based on type parameter
 */
router.get('/chart-data', async (req, res) => {
  try {
    const { type } = req.query
    let chartData = []

    switch (type) {
      case 'lot-comparison':
        // Get top 10 lots with transmitted vs rejected
        const { data: lotStats } = await callRpcWithRetry('get_lot_stats')
        
        // Get INDIC counts per lot
        const { data: indicStats } = await callRpcWithRetry('get_indic_lot_stats')
        
        // Create a map of INDIC counts by lot
        const indicMap = {}
        indicStats?.forEach(lot => {
          indicMap[lot.lot] = parseInt(lot.total) || 0
        })
        
        if (lotStats) {
          chartData = lotStats
            .filter(lot => /^Lot-\d{1,2}M?$/i.test(lot.lot))
            .slice(0, 10)
            .map(lot => ({
              lot: lot.lot,
              transmitted: lot.transmitted,
              rejected: lot.rejected,
              indic: indicMap[lot.lot] || 0
            }))
        }
        break

      case 'daily-trend':
        // Group by transmission date
        const { data: dailyData } = await supabaseAdmin
          .from('imported_books_staging')
          .select('trans_date, final_status')
          .not('trans_date', 'is', null)
          .order('trans_date', { ascending: true })

        const dailyMap = {}
        dailyData?.forEach(row => {
          const date = row.trans_date
          if (!dailyMap[date]) {
            dailyMap[date] = { date, transmitted: 0, total: 0 }
          }
          dailyMap[date].total++
          if (row.final_status?.toLowerCase() === 'transmitted') {
            dailyMap[date].transmitted++
          }
        })
        chartData = Object.values(dailyMap).slice(-30) // Last 30 days
        break

      case 'vendor-performance':
        // Get vendor completion rates
        const { data: vendors } = await supabaseAdmin
          .from('imported_books_staging')
          .select('vendor_name')
          .not('vendor_name', 'is', null)

        const uniqueVendors = [...new Set(vendors?.map(v => v.vendor_name) || [])].slice(0, 10)

        chartData = await Promise.all(
          uniqueVendors.map(async (vendor) => {
            const { count: total } = await supabaseAdmin
              .from('imported_books_staging')
              .select('*', { count: 'exact', head: true })
              .eq('vendor_name', vendor)

            const { count: transmitted } = await supabaseAdmin
              .from('imported_books_staging')
              .select('*', { count: 'exact', head: true })
              .eq('vendor_name', vendor)
              .ilike('final_status', 'transmitted')

            return {
              vendor: vendor.length > 20 ? vendor.substring(0, 20) + '...' : vendor,
              completionRate: total ? parseFloat(((transmitted / total) * 100).toFixed(2)) : 0
            }
          })
        )
        chartData.sort((a, b) => b.completionRate - a.completionRate)
        break

      case 'status-distribution':
        // Get status counts
        const { data: statusData } = await supabaseAdmin
          .from('imported_books_staging')
          .select('final_status')

        const statusMap = {}
        statusData?.forEach(row => {
          const status = row.final_status || 'No Status'
          statusMap[status] = (statusMap[status] || 0) + 1
        })

        chartData = Object.entries(statusMap).map(([status, count]) => ({
          status,
          count
        })).sort((a, b) => b.count - a.count)
        break

      case 'lot-progress':
        // Get completion rate for each lot
        const { data: progressStats } = await callRpcWithRetry('get_lot_stats')
        if (progressStats) {
          chartData = progressStats
            .filter(lot => /^Lot-\d{1,2}M?$/i.test(lot.lot))
            .map(lot => ({
              lot: lot.lot,
              completionRate: parseFloat(lot.completion_rate || 0)
            }))
            .sort((a, b) => {
              const numA = parseInt(a.lot.match(/\d+/)?.[0] || '0')
              const numB = parseInt(b.lot.match(/\d+/)?.[0] || '0')
              return numA - numB
            })
        }
        break

      default:
        return res.status(400).json({ error: 'Invalid chart type' })
    }

    res.json({ chartData })
  } catch (error) {
    console.error('Error fetching chart data:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/reports/indic-books
 * Get statistics for INDIC books (215k rows) - transmitted, lots, etc.
 */
router.get('/indic-books', async (req, res) => {
  try {
    console.log('[Reports] fetching indic-books...')
    
    // Get overall INDIC statistics
    const { data: indicStats, error: statsError } = await callRpcWithRetry('get_indic_stats')
    
    if (statsError) {
      console.error('[Reports] Error fetching INDIC stats:', statsError.message)
      return res.json({ overview: { totalBooks: 0, transmitted: 0, rejected: 0, booksToGo: 0, completionRate: '0' }, lotBreakdown: [] })
    }

    const stats = indicStats?.[0] || {
      total_indic: 0,
      in_both_files: 0,
      indic_only: 0,
      transmitted: 0,
      rejected: 0
    }

    const booksToGo = stats.total_indic - stats.transmitted
    const completionRate = stats.total_indic ? ((stats.transmitted / stats.total_indic) * 100).toFixed(2) : '0'

    // Get INDIC lot breakdown
    const { data: lotData, error: lotError } = await callRpcWithRetry('get_indic_lot_stats')
    
    let lotBreakdown = []
    if (lotData) {
      lotBreakdown = lotData.map(lot => ({
        lot: lot.lot,
        total: parseInt(lot.total),
        transmitted: parseInt(lot.transmitted),
        rejected: parseInt(lot.rejected),
        completionRate: lot.completion_rate?.toString() || '0'
      }))
    }

    res.json({
      overview: {
        totalBooks: parseInt(stats.total_indic) || 0,
        transmitted: parseInt(stats.transmitted) || 0,
        rejected: parseInt(stats.rejected) || 0,
        booksToGo,
        completionRate,
        inBothFiles: parseInt(stats.in_both_files) || 0,
        indicOnly: parseInt(stats.indic_only) || 0
      },
      lotBreakdown: lotBreakdown.sort((a, b) => b.total - a.total)
    })
  } catch (error) {
    console.error('[Reports] Error fetching INDIC books report:', {
      message: error?.message,
      code: error?.code,
      fullError: error
    })
    res.status(500).json({ error: error?.message || 'Internal server error' })
  }
})

/**
 * GET /api/reports/lot-details/:lotNumber
 * Get detailed statistics for a specific lot
 */
router.get('/lot-details/:lotNumber', async (req, res) => {
  try {
    const { lotNumber } = req.params

    const { data: books, error } = await supabaseAdmin
      .from('imported_books_staging')
      .select('*')
      .eq('lot_no', lotNumber)

    if (error) throw error

    const transmitted = books.filter(b => b.final_status?.toLowerCase() === 'transmitted').length
    const rejected = books.filter(b => b.final_status?.toLowerCase() !== 'transmitted' && b.final_status).length

    // Language breakdown
    const languageStats = {}
    books.forEach(book => {
      const lang = book.language || 'Unknown'
      languageStats[lang] = (languageStats[lang] || 0) + 1
    })

    res.json({
      lotNumber,
      totalBooks: books.length,
      transmitted,
      rejected,
      completionRate: ((transmitted / books.length) * 100).toFixed(2),
      languageBreakdown: Object.entries(languageStats).map(([language, count]) => ({
        language,
        count,
        percentage: ((count / books.length) * 100).toFixed(2)
      })).sort((a, b) => b.count - a.count),
      books: books.slice(0, 100) // Return first 100 books for preview
    })
  } catch (error) {
    console.error('Error fetching lot details:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/reports/daily-trend
 * Get daily transmission trend (last 30 days)
 */
router.get('/daily-trend', async (req, res) => {
  try {
    const { data: books } = await supabaseAdmin
      .from('imported_books_staging')
      .select('trans_date, final_status')
      .not('trans_date', 'is', null)

    // Group by date
    const dailyStats = {}
    books?.forEach(book => {
      const date = book.trans_date
      if (!dailyStats[date]) {
        dailyStats[date] = { transmitted: 0, rejected: 0 }
      }
      if (book.final_status?.toLowerCase() === 'transmitted') {
        dailyStats[date].transmitted++
      } else {
        dailyStats[date].rejected++
      }
    })

    const trend = Object.entries(dailyStats)
      .map(([date, data]) => ({
        date,
        ...data,
        total: data.transmitted + data.rejected
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30) // Last 30 days

    res.json({ trend })
  } catch (error) {
    console.error('Error fetching daily trend:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/reports/lot-status
 * Compute real-time LOT status (Closed / Open / In-Progress) for every lot.
 *
 * Status rules:
 *   Closed     — All boxes are in 'storage' stage AND every scanned book is
 *                in a final state (processable box in storage = Transmitted,
 *                or non_processable = Rejected/Hold).
 *   Open       — Lot has NO active boxes in the pipeline AND has at least one
 *                ISBN that is unaccounted for (scanned as processable but its
 *                box is not yet in storage).
 *   In-Progress — One or more boxes are actively moving through the pipeline
 *                (current_stage NOT 'storage').
 */
router.get('/lot-status', async (req, res) => {
  try {
    const db = supabaseAdmin

    // 1. Fetch all lots
    const { data: lots, error: lotsError } = await db
      .from('lots')
      .select('id, lot_number, status, created_at, total_boxes')
      .order('created_at', { ascending: false })

    if (lotsError) throw lotsError

    // 2. Fetch all boxes (id, lot_id, current_stage)
    const { data: boxes, error: boxesError } = await db
      .from('boxes')
      .select('id, lot_id, current_stage')

    if (boxesError) throw boxesError

    // 3. Fetch all scans (isbn, assigned_box_id, scan_status)
    const { data: scans, error: scansError } = await db
      .from('warehouse_book_scans')
      .select('isbn, assigned_box_id, scan_status')

    if (scansError) throw scansError

    // Index boxes by id and group by lot
    const boxById = {}
    const boxesByLot = {}
    for (const box of boxes || []) {
      boxById[box.id] = box
      if (!boxesByLot[box.lot_id]) boxesByLot[box.lot_id] = []
      boxesByLot[box.lot_id].push(box)
    }

    // Group scans by lot via box
    const scansByLot = {}
    for (const scan of scans || []) {
      const box = boxById[scan.assigned_box_id]
      if (!box) continue
      const lotId = box.lot_id
      if (!scansByLot[lotId]) scansByLot[lotId] = []
      scansByLot[lotId].push({ ...scan, boxStage: box.current_stage })
    }

    const PIPELINE_STAGES = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit']

    const result = (lots || []).map(lot => {
      const lotBoxes = boxesByLot[lot.id] || []
      const lotScans = scansByLot[lot.id] || []

      const totalBoxes = lotBoxes.length
      const activeBoxes = lotBoxes.filter(b => PIPELINE_STAGES.includes(b.current_stage))
      const storedBoxes = lotBoxes.filter(b => b.current_stage === 'storage')

      const totalScans = lotScans.length
      const processableScans = lotScans.filter(s => s.scan_status === 'processable')
      const nonProcessableScans = lotScans.filter(s => s.scan_status !== 'processable')

      // "Transmitted" = processable book whose box reached storage
      const transmittedScans = processableScans.filter(s => s.boxStage === 'storage')
      // "Pending" = processable book still in pipeline
      const pendingScans = processableScans.filter(s => PIPELINE_STAGES.includes(s.boxStage))

      // Determine computed status
      let computedStatus
      if (totalBoxes === 0) {
        // No boxes at all — lot is open/not started
        computedStatus = 'open'
      } else if (activeBoxes.length > 0) {
        // At least one box still moving through pipeline
        computedStatus = 'in-progress'
      } else if (pendingScans.length === 0 && storedBoxes.length === totalBoxes) {
        // All boxes stored, no unaccounted processable books
        computedStatus = 'closed'
      } else if (activeBoxes.length === 0 && pendingScans.length > 0) {
        // No active boxes but some processable books unresolved
        computedStatus = 'open'
      } else {
        computedStatus = 'in-progress'
      }

      return {
        lot_id: lot.id,
        lot_number: lot.lot_number,
        lot_status: lot.status,
        computed_status: computedStatus,
        created_at: lot.created_at,
        total_boxes: totalBoxes,
        active_boxes: activeBoxes.length,
        stored_boxes: storedBoxes.length,
        total_scans: totalScans,
        transmitted: transmittedScans.length,
        non_processable: nonProcessableScans.length,
        pending: pendingScans.length,
      }
    })

    res.json({ success: true, lots: result })
  } catch (error) {
    console.error('[Reports] lot-status error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
