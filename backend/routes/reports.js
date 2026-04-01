import express from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = express.Router()

/**
 * GET /api/reports/finished-lots
 * Get statistics for finished lots (Lot 1-51) from imported_books_staging
 */
router.get('/finished-lots', async (req, res) => {
  try {
    // Get total count (all data)
    const { count: totalBooks, error: countError } = await supabaseAdmin
      .from('imported_books_staging')
      .select('*', { count: 'exact', head: true })
    
    if (countError) throw countError

    // Get transmitted count
    const { count: transmitted, error: transmittedError } = await supabaseAdmin
      .from('imported_books_staging')
      .select('*', { count: 'exact', head: true })
      .ilike('final_status', 'transmitted')
    
    if (transmittedError) throw transmittedError

    // Get rejected count
    const { count: rejected, error: rejectedError } = await supabaseAdmin
      .from('imported_books_staging')
      .select('*', { count: 'exact', head: true })
      .not('final_status', 'is', null)
      .not('final_status', 'ilike', 'transmitted')
    
    if (rejectedError) throw rejectedError

    const booksToGo = totalBooks - transmitted

    // Get lot breakdown using RPC or raw SQL for aggregation
    const { data: lotData, error: lotError } = await supabaseAdmin
      .rpc('get_lot_stats')
    
    // Fallback: If RPC doesn't exist, fetch unique lots and count separately
    let lotBreakdown = []
    if (lotError || !lotData) {
      // Get unique lot numbers
      const { data: lots } = await supabaseAdmin
        .from('imported_books_staging')
        .select('lot_no')
        .not('lot_no', 'is', null)
      
      const uniqueLots = [...new Set(lots?.map(l => l.lot_no) || [])]
      
      // Get stats for each lot (top 10 only for performance)
      lotBreakdown = await Promise.all(
        uniqueLots.slice(0, 10).map(async (lot) => {
          const { count: total } = await supabaseAdmin
            .from('imported_books_staging')
            .select('*', { count: 'exact', head: true })
            .eq('lot_no', lot)
          
          const { count: lotTransmitted } = await supabaseAdmin
            .from('imported_books_staging')
            .select('*', { count: 'exact', head: true })
            .eq('lot_no', lot)
            .ilike('final_status', 'transmitted')
          
          const { count: lotRejected } = await supabaseAdmin
            .from('imported_books_staging')
            .select('*', { count: 'exact', head: true })
            .eq('lot_no', lot)
            .not('final_status', 'is', null)
            .not('final_status', 'ilike', 'transmitted')
          
          return {
            lot,
            total: total || 0,
            transmitted: lotTransmitted || 0,
            rejected: lotRejected || 0,
            completionRate: total ? ((lotTransmitted / total) * 100).toFixed(2) : '0'
          }
        })
      )
    } else {
      lotBreakdown = lotData
    }

    // Get vendor breakdown (top 10)
    const { data: vendors } = await supabaseAdmin
      .from('imported_books_staging')
      .select('vendor_name')
      .not('vendor_name', 'is', null)
    
    const uniqueVendors = [...new Set(vendors?.map(v => v.vendor_name) || [])].slice(0, 10)
    
    const vendorBreakdown = await Promise.all(
      uniqueVendors.map(async (vendor) => {
        const { count: total } = await supabaseAdmin
          .from('imported_books_staging')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_name', vendor)
        
        const { count: vendorTransmitted } = await supabaseAdmin
          .from('imported_books_staging')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_name', vendor)
          .ilike('final_status', 'transmitted')
        
        const { count: vendorRejected } = await supabaseAdmin
          .from('imported_books_staging')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_name', vendor)
          .not('final_status', 'is', null)
          .not('final_status', 'ilike', 'transmitted')
        
        return {
          vendor,
          total: total || 0,
          transmitted: vendorTransmitted || 0,
          rejected: vendorRejected || 0,
          completionRate: total ? ((vendorTransmitted / total) * 100).toFixed(2) : '0'
        }
      })
    )

    // Filter out invalid lots and sort in ascending order
    const validLots = lotBreakdown.filter(lot => {
      // Only include lots that match Lot-XX or Lot-XXM pattern
      return /^Lot-\d{1,2}M?$/i.test(lot.lot)
    }).sort((a, b) => {
      // Extract number from lot name for proper sorting
      const numA = parseInt(a.lot.match(/\d+/)?.[0] || '0')
      const numB = parseInt(b.lot.match(/\d+/)?.[0] || '0')
      return numA - numB // Ascending order
    })

    res.json({
      overview: {
        totalBooks: totalBooks || 0,
        transmitted: transmitted || 0,
        rejected: rejected || 0,
        booksToGo,
        completionRate: totalBooks ? ((transmitted / totalBooks) * 100).toFixed(2) : '0'
      },
      lotBreakdown: validLots,
      vendorBreakdown: vendorBreakdown.sort((a, b) => b.total - a.total)
    })
  } catch (error) {
    console.error('Error fetching finished lots report:', error)
    res.status(500).json({ error: error.message })
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
        const { data: lotStats } = await supabaseAdmin.rpc('get_lot_stats')
        
        // Get INDIC counts per lot
        const { data: indicStats } = await supabaseAdmin.rpc('get_indic_lot_stats')
        
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
        const { data: progressStats } = await supabaseAdmin.rpc('get_lot_stats')
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
    // Get overall INDIC statistics
    const { data: indicStats, error: statsError } = await supabaseAdmin
      .rpc('get_indic_stats')
    
    if (statsError) throw statsError

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
    const { data: lotData, error: lotError } = await supabaseAdmin
      .rpc('get_indic_lot_stats')
    
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
    console.error('Error fetching INDIC books report:', error)
    res.status(500).json({ error: error.message })
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

export default router
