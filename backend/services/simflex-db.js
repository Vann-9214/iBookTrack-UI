import axios from 'axios'

// Simflex WMS API Configuration (WFH Mode)
// Endpoint discovered by decompiling WMSConnect.dll
const SIMFLEX_API_URL = 'https://simflex.innodata.com/wms.services/WMS.Services.asmx/TechGetDatabaseDataset'
const SIMFLEX_API_KEY = '00001111'
const SIMFLEX_CONFIG = '046'

async function query(script) {
  const response = await axios.get(SIMFLEX_API_URL, {
    params: { apiKey: SIMFLEX_API_KEY, config: SIMFLEX_CONFIG, script },
    timeout: 15000
  })
  // Response is [[row, row, ...]] - unwrap first array
  const data = response.data
  if (data && Array.isArray(data) && Array.isArray(data[0])) return data[0]
  return data
}

/**
 * Get today's scanning statistics from zeusz_IsbnStatus
 */
export async function getTodayScanningSummary(startDate, endDate) {
  try {
    const where = startDate && endDate
      ? `CAST(ScanDate AS DATE) BETWEEN '${startDate}' AND '${endDate}'`
      : `ScanDate >= CAST(GETDATE() AS DATE) AND ScanDate < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))`
    const rows = await query(`SELECT Status, COUNT(*) AS cnt FROM zeusz_IsbnStatus WHERE ${where} GROUP BY Status ORDER BY cnt DESC`)
    const data = Array.isArray(rows) ? rows : []
    const total = data.reduce((s, r) => s + r.cnt, 0)
    const completed = data.filter(r => r.Status && r.Status.includes('COMPLETED')).reduce((s, r) => s + r.cnt, 0)
    const failed = data.filter(r => r.Status && r.Status.includes('FAILED')).reduce((s, r) => s + r.cnt, 0)
    const ongoing = data.filter(r => r.Status && r.Status.includes('ONGOING')).reduce((s, r) => s + r.cnt, 0)
    return { success: true, data: { TotalScans: total, Completed: completed, Failed: failed, Ongoing: ongoing, byStatus: data } }
  } catch (error) {
    console.error('Error fetching scanning summary:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get scanning data by date range
 */
export async function getScanningData(startDate, endDate) {
  try {
    const start = new Date(startDate).toISOString().split('T')[0]
    const end = new Date(endDate).toISOString().split('T')[0]
    const rows = await query(`SELECT TOP 100 ISBN, Status, ScanMachineName AS MachineName, ScanDate, Updated, PageCount, ScanUser, BoxNumber FROM zeusz_IsbnStatus WHERE CAST(ScanDate AS DATE) BETWEEN '${start}' AND '${end}' ORDER BY Updated DESC`)
    return { success: true, data: rows }
  } catch (error) {
    console.error('Error fetching scanning data:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get scanning stats by machine
 */
export async function getScanningByMachine(startDate, endDate) {
  try {
    const where = startDate && endDate
      ? `CAST(ScanDate AS DATE) BETWEEN '${startDate}' AND '${endDate}'`
      : `ScanDate >= CAST(GETDATE() AS DATE) AND ScanDate < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))`
    const rows = await query(`SELECT ScanMachineName AS MachineName, COUNT(*) AS TotalScans FROM zeusz_IsbnStatus WHERE ${where} GROUP BY ScanMachineName ORDER BY TotalScans DESC`)
    return { success: true, data: Array.isArray(rows) ? rows : [] }
  } catch (error) {
    console.error('Error fetching machine stats:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get scanning stats by stage (Scanning, Preval, Tif2PDF, Validate, Transmission_Archive)
 */
export async function getScanningByStage(startDate, endDate) {
  try {
    const where = startDate && endDate
      ? `CAST(ScanDate AS DATE) BETWEEN '${startDate}' AND '${endDate}'`
      : `ScanDate >= CAST(GETDATE() AS DATE) AND ScanDate < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))`
    const rows = await query(`SELECT Status, COUNT(*) AS cnt FROM zeusz_IsbnStatus WHERE ${where} GROUP BY Status ORDER BY cnt DESC`)
    const data = Array.isArray(rows) ? rows : []
    // Parse "Stage STATUS" format into grouped stages
    const stageMap = {}
    data.forEach(r => {
      const parts = r.Status ? r.Status.split(' ') : []
      const statusWord = parts[parts.length - 1] // COMPLETED / ONGOING / FAILED
      const stage = parts.slice(0, parts.length - 1).join(' ') // e.g. "Preval"
      if (!stageMap[stage]) stageMap[stage] = { Stage: stage, Total: 0, Completed: 0, Ongoing: 0, Failed: 0 }
      stageMap[stage].Total += r.cnt
      if (statusWord === 'COMPLETED') stageMap[stage].Completed += r.cnt
      else if (statusWord === 'ONGOING') stageMap[stage].Ongoing += r.cnt
      else if (statusWord === 'FAILED') stageMap[stage].Failed += r.cnt
    })
    return { success: true, data: Object.values(stageMap) }
  } catch (error) {
    console.error('Error fetching stage stats:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get performance ranking by scan user for a given date
 */
export async function getScanningRanking(date) {
  try {
    const d = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    const rows = await query(`SELECT ScanUser, COUNT(*) AS Books, SUM(PageCount) AS Pages FROM zeusz_IsbnStatus WHERE CAST(ScanDate AS DATE) = '${d}' AND ScanUser IS NOT NULL GROUP BY ScanUser ORDER BY Books DESC`)
    const data = Array.isArray(rows) ? rows : []
    const maxBooks = data[0]?.Books || 1
    const ranked = data.map((r, i) => ({
      Rank: i + 1,
      ScanUser: r.ScanUser,
      Books: r.Books,
      Pages: r.Pages || 0,
      Score: maxBooks > 0 ? ((r.Books / maxBooks) * 100).toFixed(2) + '%' : '0%',
      ScoreNum: maxBooks > 0 ? (r.Books / maxBooks) * 100 : 0
    }))
    const totalBooks = data.reduce((s, r) => s + r.Books, 0)
    const totalPages = data.reduce((s, r) => s + (r.Pages || 0), 0)
    return { success: true, data: ranked, totalBooks, totalPages, highestOutput: data[0]?.Books || 0, avgOutput: data.length > 0 ? Math.round(totalBooks / data.length) : 0 }
  } catch (error) {
    console.error('Error fetching ranking:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get full scan data for export (up to 5000 rows)
 */
export async function getScanningExportData(date) {
  try {
    const d = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    const rows = await query(`SELECT TOP 5000 ScanDate, ScanUser, BoxNumber, ISBN, PageCount, Status, ScanMachineName AS Machine, Updated FROM zeusz_IsbnStatus WHERE CAST(ScanDate AS DATE) = '${d}' ORDER BY Updated DESC`)
    return { success: true, data: Array.isArray(rows) ? rows : [] }
  } catch (error) {
    console.error('Error fetching export data:', error)
    return { success: false, error: error.message }
  }
}

export default {
  getTodayScanningSummary,
  getScanningData,
  getScanningByMachine,
  getScanningByStage,
  getScanningRanking,
  getScanningExportData
}
