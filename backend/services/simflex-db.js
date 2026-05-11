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

// DB stores MachineName (e.g. IKSCEWKS0013822) in ScanMachineName column
// Map: MachineName → Scanner Machine ID
const MACHINE_ID_MAP = {
  'INNO_129367-2': 'A-1081125000079',
  'INNO_129367-1': 'A-1081125000080',
  'IKSCEWKS0013885': 'CL8C100252',
  'IKSCEWKS0013874': 'CL8C100248',
  'IKSCEWKS0014879': 'CL8C100351',
  'IKSCEWKS0014899': 'CL8C100350',
  'IKSCEWKS0014898': 'CL8C100334',
  'IKSCEWKS0014880': 'CL8C100352',
  'IKSCEWKS0014878': 'CL8C100347',
  'IKSCEWKS0014900': 'CL8C100321',
  'IKSCEWKS0013873': 'CL8C100265',
  'IKSCEWKS0013876': 'CL8C100254',
  'IKSCEWKS0013877': 'CL8C100272',
  'IKSCEWKS0013888': 'CL8C100250',
  'IKSCEWKS0013887': 'CLBC100246',
  'IKSCEWKS0013886': 'CL8C100267',
  'IKSCEWKS0013882': 'CL8C100225',
  'IKSCEWKS0013891': 'CL8C100275',
  'IKSCESCN0013829': 'CL8C100276',
  'IKSCEWKS0013823': 'CL8C100229',
  'IKSCEWKS0013883': 'CL8C100255',
  'IKSCEWKS0013822': 'CL8C100249',
  'IKSCEWKS0013821': 'CL8C100251',
  'IKSCEWKS0013878': 'CL8C100245',
  'IKSCEWKS0013761': 'CL8C100253',
  'IKSCEWKS0013881': 'CL8C100235',
  'IKSCEWKS0013763': 'CL8C100239',
  'IKSCEWKS0013765': 'CL8C100320',
  'IKSCEWKS0013764': 'CL8C100247',
  'IKSCEWKS0013880': 'CL8C100234',
  'IKSCEWKS0013819': 'CL8C100256',
  'IKSCEWKS0013890': 'CL8C100274',
  'IKSCEWKS0013820': 'CL8C100266',
  'IKSCEWKS0013879': 'CL8C100237',
  'IKSCEWKS0013892': 'CL8C100257',
  'IKSCEWKS0013787': 'JF402987',
  'IKSCEWKS0013789': 'JF403054',
  'IKSCEWKS0013786': 'JF403053',
  'IKSCEWKS0013762': 'JF402992',
}

/**
 * Get scanning stats by machine
 */
export async function getScanningByMachine(startDate, endDate) {
  try {
    const where = startDate && endDate
      ? `CAST(ScanDate AS DATE) BETWEEN '${startDate}' AND '${endDate}'`
      : `ScanDate >= CAST(GETDATE() AS DATE) AND ScanDate < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))`
    const rows = await query(`SELECT ScanMachineName AS MachineName, ScanUser AS [User], COUNT(*) AS TotalScans FROM zeusz_IsbnStatus WHERE ${where} GROUP BY ScanMachineName, ScanUser ORDER BY TotalScans DESC`)
    const data = (Array.isArray(rows) ? rows : []).map(r => ({
      MachineName: r.MachineName,
      MachineID: MACHINE_ID_MAP[r.MachineName] || r.MachineName,
      User: r.User,
      TotalScans: r.TotalScans,
    }))
    return { success: true, data }
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
 * Get all-time total scan count from Simflex
 */
export async function getTotalScansAllTime() {
  try {
    const rows = await query(`SELECT COUNT(*) AS Total FROM zeusz_IsbnStatus`)
    const data = Array.isArray(rows) ? rows : []
    return { success: true, total: data[0]?.Total || 0 }
  } catch (error) {
    console.error('Error fetching all-time total:', error)
    return { success: false, total: 0 }
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

/**
 * Get Simflex scan status for a list of ISBNs.
 * Returns per-ISBN latest status, specifically checking if
 * Transmission_Archive COMPLETED exists for each ISBN.
 */
export async function getSimflexStatusForISBNs(isbns) {
  try {
    if (!isbns || isbns.length === 0) return { success: true, data: [] }

    // Build safe IN list — ISBNs are numeric/alphanumeric, no SQL injection risk
    // but we sanitize anyway by stripping non-word characters
    const safelist = isbns.map(i => `'${String(i).replace(/[^a-zA-Z0-9\-]/g, '')}'`).join(',')

    // Get all status rows for these ISBNs (all time, not just today)
    const rows = await query(
      `SELECT ISBN, Status, ScanDate, Updated, PageCount, ScanUser, BoxNumber
       FROM zeusz_IsbnStatus
       WHERE ISBN IN (${safelist})
       ORDER BY Updated DESC`
    )

    const data = Array.isArray(rows) ? rows : []

    // Group by ISBN — we want to know if each ISBN has a Transmission_Archive COMPLETED row
    const byIsbn = {}
    data.forEach(r => {
      const isbn = r.ISBN
      if (!byIsbn[isbn]) {
        byIsbn[isbn] = {
          isbn,
          statuses: [],
          transmissionCompleted: false,
          latestStatus: null,
          latestUpdated: null,
          boxNumber: r.BoxNumber || null,
          scanUser: r.ScanUser || null,
        }
      }
      byIsbn[isbn].statuses.push(r.Status)
      // Check if this row is Transmission_Archive COMPLETED
      if (r.Status && r.Status.toLowerCase().includes('transmission_archive') && r.Status.toUpperCase().includes('COMPLETED')) {
        byIsbn[isbn].transmissionCompleted = true
      }
      // Track latest overall status
      if (!byIsbn[isbn].latestUpdated || new Date(r.Updated) > new Date(byIsbn[isbn].latestUpdated)) {
        byIsbn[isbn].latestStatus = r.Status
        byIsbn[isbn].latestUpdated = r.Updated
        byIsbn[isbn].boxNumber = r.BoxNumber || byIsbn[isbn].boxNumber
        byIsbn[isbn].scanUser = r.ScanUser || byIsbn[isbn].scanUser
      }
    })

    // For ISBNs not found in Simflex at all, mark explicitly
    isbns.forEach(isbn => {
      if (!byIsbn[isbn]) {
        byIsbn[isbn] = {
          isbn,
          statuses: [],
          transmissionCompleted: false,
          latestStatus: null,
          latestUpdated: null,
          boxNumber: null,
          scanUser: null,
        }
      }
    })

    return { success: true, data: Object.values(byIsbn) }
  } catch (error) {
    console.error('Error fetching Simflex status for ISBNs:', error)
    return { success: false, error: error.message, data: [] }
  }
}

export default {
  getTodayScanningSummary,
  getScanningData,
  getScanningByMachine,
  getScanningByStage,
  getScanningRanking,
  getScanningExportData,
  getTotalScansAllTime,
  getSimflexStatusForISBNs,
}
