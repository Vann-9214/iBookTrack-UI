import { query, sql, safeDate, normalizeStatus, isMonitoredStatus, reworkFilter, NONE_MACHINE } from './client.js'
import { logger } from '../../../utils/logger.js'

export async function getDailyOutputCount(date, location = 'mustang') {
  try {
    const d = date ? safeDate(date) : new Date().toISOString().split('T')[0]
    // Count distinct ISBNs whose LATEST status is Transmission_Archive COMPLETED
    // and that final status was recorded today (filter by Updated, not ScanDate,
    // because ScanDate is set when the book is first scanned and never changes).
    const rows = await query(sql`SELECT COUNT(DISTINCT t.ISBN) AS cnt
       FROM zeusz_IsbnStatus t
       INNER JOIN (
         SELECT ISBN, MAX(Updated) AS MaxUpdated
         FROM zeusz_IsbnStatus
         GROUP BY ISBN
       ) latest ON t.ISBN = latest.ISBN AND t.Updated = latest.MaxUpdated
       WHERE t.Status = 'Transmission_Archive COMPLETED'
         AND CAST(t.Updated AS DATE) = '${sql.raw(d)}'`,
      location
    )
    const data = Array.isArray(rows) ? rows : []
    return { success: true, count: data[0]?.cnt || 0 }
  } catch (error) {
    logger.error('Error fetching daily output count:', error)
    return { success: false, count: 0 }
  }
}

export async function getDailyOutputRows(date, location = 'mustang', newProcessOnly = false) {
  try {
    const d = date ? safeDate(date) : new Date().toISOString().split('T')[0]
    const reworkFilter = newProcessOnly ? "AND IsRework = 'False'" : ""

    // Match the dashboard card count: latest status per ISBN added today is
    // Transmission_Archive COMPLETED, with optional New Process Only filter.
    const rows = await query(sql`SELECT t.ISBN, t.Updated, t.ScanUser, t.BoxNumber, t.PageCount, t.ScanDate
       FROM zeusz_IsbnStatus t
       INNER JOIN (
         SELECT ISBN, MAX(Updated) AS MaxUpdated
         FROM zeusz_IsbnStatus
         WHERE CAST(DateAdded AS DATE) = '${sql.raw(d)}' ${sql.raw(reworkFilter)}
         GROUP BY ISBN
       ) latest ON t.ISBN = latest.ISBN AND t.Updated = latest.MaxUpdated
       WHERE t.Status = 'Transmission_Archive COMPLETED'
         ${sql.raw(reworkFilter)}
         AND CAST(DateAdded AS DATE) = '${sql.raw(d)}'
       ORDER BY t.Updated DESC`,
      location
    )
    const data = Array.isArray(rows) ? rows : []
    return { success: true, rows: data.map(r => ({
      isbn: r.ISBN,
      updated: r.Updated,
      scan_user: r.ScanUser,
      box_number: r.BoxNumber,
      page_count: r.PageCount,
      scan_date: r.ScanDate,
    })) }
  } catch (error) {
    logger.error('Error fetching daily output rows:', error)
    return { success: false, rows: [] }
  }
}

export async function getTodayScanningSummary(startDate, endDate, location = 'mustang', newProcessOnly = false) {
  try {
    const dateWhere = startDate && endDate
      ? sql`CAST(DateAdded AS DATE) BETWEEN ${safeDate(startDate)} AND ${safeDate(endDate)}`
      : sql`CAST(DateAdded AS DATE) = CAST(GETDATE() AS DATE)`

    const rows = await query(sql`SELECT Status, COUNT(*) AS cnt FROM zeusz_IsbnStatus WHERE ${sql.raw(dateWhere)}${sql.raw(reworkFilter(newProcessOnly))} GROUP BY Status ORDER BY cnt DESC`,
      location
    )
    const data = (Array.isArray(rows) ? rows : [])
      .map(r => ({ ...r, Status: normalizeStatus(r.Status) }))
      .filter(r => isMonitoredStatus(r.Status))
    const completed = data.filter(r => r.Status?.includes('COMPLETED')).reduce((s, r) => s + r.cnt, 0)
    const failed    = data.filter(r => r.Status?.includes('FAILED')).reduce((s, r) => s + r.cnt, 0)
    const ongoing   = data.filter(r => r.Status?.includes('ONGOING')).reduce((s, r) => s + r.cnt, 0)
    const total     = completed + ongoing  // exclude FAILED from total
    return { success: true, data: { TotalScans: total, Completed: completed, Failed: failed, Ongoing: ongoing, byStatus: data } }
  } catch (error) {
    logger.error('Error fetching scanning summary:', error)
    return { success: false, error: error.message }
  }
}

/**
 * For a list of ISBNs, return the latest Scan Manager row per ISBN that has a
 * machine or user. This enriches status-only rows with the actual scan
 * workstation and operator that Scan Manager reports for the book.
 *
 * @param {string[]} isbns
 * @param {'mustang'|'jaguar'} [location='mustang']
 * @returns {Object<string, {ScanMachineName: string|null, ScanUser: string|null}>}
 */
async function getLatestMachineUserForISBNs(isbns, location = 'mustang') {
  if (!Array.isArray(isbns) || isbns.length === 0) return {}

  const result = {}
  const chunkSize = 200
  for (let i = 0; i < isbns.length; i += chunkSize) {
    const chunk = isbns.slice(i, i + chunkSize)
    const safelist = chunk
      .map(isbn => `'${String(isbn).replace(/[^a-zA-Z0-9\-]/g, '')}'`)
      .join(',')

    const rows = await query(sql`SELECT t.ISBN, t.ScanMachineName AS ScanMachineName, t.ScanUser
       FROM zeusz_IsbnStatus t
       INNER JOIN (
         SELECT ISBN, MAX(Updated) AS MaxUpdated
         FROM zeusz_IsbnStatus
         WHERE ISBN IN (${sql.raw(safelist)})
           AND (ScanMachineName IS NOT NULL OR ScanUser IS NOT NULL)
         GROUP BY ISBN
       ) m ON t.ISBN = m.ISBN AND t.Updated = m.MaxUpdated
       WHERE t.ScanMachineName IS NOT NULL OR t.ScanUser IS NOT NULL`,
      location
    )

    for (const r of (Array.isArray(rows) ? rows : [])) {
      if (r.ISBN) {
        result[r.ISBN] = {
          ScanMachineName: r.ScanMachineName || null,
          ScanUser: r.ScanUser || null,
        }
      }
    }
  }

  return result
}

/**
 * Get individual scan records within a date range (up to 100 rows).
 * Columns: ISBN, Status, MachineName, ScanDate, Updated, PageCount, ScanUser, BoxNumber.
 *
 * @param {string} startDate
 * @param {string} endDate
 */
export async function getScanningData(startDate, endDate, location = 'mustang', newProcessOnly = false) {
  try {
    const start = safeDate(startDate)
    const end   = safeDate(endDate)
    const rows = await query(sql`SELECT TOP 100 ISBN, Status, ScanMachineName AS MachineName, ScanDate, Updated, PageCount, ScanUser, BoxNumber, IsRework
       FROM zeusz_IsbnStatus
       WHERE CAST(DateAdded AS DATE) BETWEEN '${sql.raw(start)}' AND '${sql.raw(end)}'${sql.raw(reworkFilter(newProcessOnly))}
       ORDER BY Updated DESC`,
      location
    )
    const data = (Array.isArray(rows) ? rows : [])
      .map(r => ({ ...r, Status: normalizeStatus(r.Status) }))
      .filter(r => isMonitoredStatus(r.Status))
    return { success: true, data }
  } catch (error) {
    logger.error('Error fetching scanning data:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get scan counts grouped by scanning machine (hostname + user), optionally
 * filtered to a date range.  Enriches results with physical scanner machine IDs
 * from MACHINE_ID_MAP.
 *
 * @param {string} [startDate]
 * @param {string} [endDate]
 */
export async function getScanningByMachine(startDate, endDate, location = 'mustang', newProcessOnly = false) {
  try {
    const dateWhere = startDate && endDate
      ? sql`CAST(DateAdded AS DATE) BETWEEN ${safeDate(startDate)} AND ${safeDate(endDate)}`
      : sql`CAST(DateAdded AS DATE) = CAST(GETDATE() AS DATE)`

    const rows = await query(sql`SELECT ScanMachineName AS MachineName, COUNT(*) AS TotalScans
       FROM zeusz_IsbnStatus
       WHERE ${sql.raw(dateWhere)} AND Status NOT LIKE '%FAILED%'${sql.raw(reworkFilter(newProcessOnly))}
       GROUP BY ScanMachineName
       ORDER BY TotalScans DESC`,
      location
    )
    const data = (Array.isArray(rows) ? rows : []).map(r => ({
      MachineName: r.MachineName,
      MachineID: r.MachineName,
      TotalScans: r.TotalScans,
    }))
    return { success: true, data }
  } catch (error) {
    logger.error('Error fetching machine stats:', error)
    return { success: false, error: error.message }
  }
}

export async function getBooksByMachine(startDate, endDate, machineName, location = 'mustang', newProcessOnly = false) {
  try {
    const dateWhere = startDate && endDate
      ? sql`CAST(DateAdded AS DATE) BETWEEN ${safeDate(startDate)} AND ${safeDate(endDate)}`
      : sql`CAST(DateAdded AS DATE) = CAST(GETDATE() AS DATE)`
    const isNoneMachine = String(machineName).trim() === NONE_MACHINE
    const machineWhere = isNoneMachine
      ? sql`(ScanMachineName IS NULL OR LTRIM(RTRIM(ScanMachineName)) = '')`
      : sql`ScanMachineName = ${machineName}`
    const rows = await query(sql`SELECT TOP 50000 ISBN, Status, Updated, ScanDate, ScanUser
       FROM zeusz_IsbnStatus
       WHERE ${sql.raw(dateWhere)} AND ${sql.raw(machineWhere)}
         AND Status NOT LIKE '%FAILED%'${sql.raw(reworkFilter(newProcessOnly))}
       ORDER BY Updated DESC`,
      location
    )
    const latestByIsbn = new Map()
    for (const row of (Array.isArray(rows) ? rows : [])) {
      if (!row.ISBN || latestByIsbn.has(row.ISBN)) continue
      const status = normalizeStatus(row.Status)
      if (!isMonitoredStatus(status)) continue
      latestByIsbn.set(row.ISBN, { ...row, Status: status })
    }
    const books = [...latestByIsbn.values()]
    return { success: true, books, totalBooks: books.length }
  } catch (error) {
    logger.error('Error fetching machine books:', error)
    return { success: false, books: [], totalBooks: 0, error: error.message }
  }
}

/**
 * Get scan counts grouped by pipeline stage (Scanning, Preval, Tif2PDF,
 * Validate, Transmission_Archive) with Completed/Ongoing/Failed sub-counts.
 *
 * @param {string} [startDate]
 * @param {string} [endDate]
 */
export async function getScanningByStage(startDate, endDate, location = 'mustang', newProcessOnly = false) {
  try {
    const dateWhere = startDate && endDate
      ? sql`CAST(DateAdded AS DATE) BETWEEN ${safeDate(startDate)} AND ${safeDate(endDate)}`
      : sql`CAST(DateAdded AS DATE) = CAST(GETDATE() AS DATE)`

    // Fetch all rows for the location and date range, then deduplicate by latest
    // status per ISBN in JavaScript (Scan Manager API does not support window functions).
    const rows = await query(sql`SELECT TOP 10000 ISBN, Status, Updated FROM zeusz_IsbnStatus WHERE ${sql.raw(dateWhere)}${sql.raw(reworkFilter(newProcessOnly))} ORDER BY Updated DESC`,
      location
    )
    const data = Array.isArray(rows) ? rows : []

    // Keep only the most-recent row per ISBN
    const latestByIsbn = new Map()
    for (const r of data) {
      const isbn = r.ISBN
      if (!isbn) continue
      const existing = latestByIsbn.get(isbn)
      if (!existing || new Date(r.Updated) > new Date(existing.Updated)) {
        latestByIsbn.set(isbn, r)
      }
    }

    // Build stage breakdown — Status format: "StageName KEYWORD" e.g. "Preval COMPLETED"
    const stageMap = {}
    for (const r of latestByIsbn.values()) {
      const status = normalizeStatus(r.Status)
      if (!isMonitoredStatus(status)) continue
      const parts = status ? status.split(' ') : []
      const statusWord = parts[parts.length - 1]
      const stage      = parts.slice(0, parts.length - 1).join(' ')
      if (!stageMap[stage]) stageMap[stage] = { Stage: stage, Total: 0, Completed: 0, Ongoing: 0, Failed: 0 }
      stageMap[stage].Total += 1
      if (statusWord === 'COMPLETED') stageMap[stage].Completed += 1
      else if (statusWord === 'ONGOING') stageMap[stage].Ongoing += 1
      else if (statusWord === 'FAILED')  stageMap[stage].Failed  += 1
    }
    return { success: true, data: Object.values(stageMap) }
  } catch (error) {
    logger.error('Error fetching stage stats:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get the all-time total scan count from Scan Manager.
 * Used to display a "grand total scanned" figure on the dashboard.
 */
export async function getTotalScansAllTime() {
  try {
    const rows = await query(sql`SELECT COUNT(*) AS Total FROM zeusz_IsbnStatus WHERE Status NOT LIKE '%FAILED%'`)
    const data = Array.isArray(rows) ? rows : []
    return { success: true, total: data[0]?.Total || 0 }
  } catch (error) {
    logger.error('Error fetching all-time total:', error)
    return { success: false, total: 0 }
  }
}

/**
 * Get a performance ranking of scan users for a given date.
 * Each user is given a score (books / top-performer books × 100%).
 * Returns overall totals as well as the per-user ranked list.
 *
 * @param {string} [date] - ISO date string; defaults to today
 * @param {'mustang'|'jaguar'} [location='mustang']
 */
export async function getScanningRanking(date, location = 'mustang') {
  try {
    const d = date ? safeDate(date) : new Date().toISOString().split('T')[0]
    const rows = await query(sql`SELECT ScanUser, COUNT(*) AS Books, SUM(PageCount) AS Pages
       FROM zeusz_IsbnStatus
       WHERE CAST(ScanDate AS DATE) = '${sql.raw(d)}' AND ScanUser IS NOT NULL AND Status NOT LIKE '%FAILED%'
       GROUP BY ScanUser
       ORDER BY Books DESC`,
      location
    )
    const data = Array.isArray(rows) ? rows : []
    const maxBooks = data[0]?.Books || 1
    const ranked = data.map((r, i) => ({
      Rank:     i + 1,
      ScanUser: r.ScanUser,
      Books:    r.Books,
      Pages:    r.Pages || 0,
      Score:    maxBooks > 0 ? ((r.Books / maxBooks) * 100).toFixed(2) + '%' : '0%',
      ScoreNum: maxBooks > 0 ? (r.Books / maxBooks) * 100 : 0
    }))
    const totalBooks = data.reduce((s, r) => s + r.Books, 0)
    const totalPages = data.reduce((s, r) => s + (r.Pages || 0), 0)
    return {
      success:       true,
      data:          ranked,
      totalBooks,
      totalPages,
      highestOutput: data[0]?.Books || 0,
      avgOutput:     data.length > 0 ? Math.round(totalBooks / data.length) : 0
    }
  } catch (error) {
    logger.error('Error fetching ranking:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get full scan data for a given date, up to 5000 rows.
 * Used for CSV export from the scanning page.
 *
 * @param {string} [date] - ISO date string; defaults to today
 * @param {'mustang'|'jaguar'} [location='mustang']
 */
export async function getScanningExportData(date, location = 'mustang') {
  try {
    const d = date ? safeDate(date) : new Date().toISOString().split('T')[0]
    const rows = await query(sql`SELECT TOP 50000 ScanDate, ScanUser, BoxNumber, ISBN, PageCount, Status, ScanMachineName AS Machine, Updated
       FROM zeusz_IsbnStatus
       WHERE CAST(ScanDate AS DATE) = '${sql.raw(d)}'
       ORDER BY Updated DESC`,
      location
    )
    return { success: true, data: Array.isArray(rows) ? rows : [] }
  } catch (error) {
    logger.error('Error fetching export data:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Dashboard Scan stage (step 5) — counts distinct ISBNs in any of the
 * pre-transmission statuses: Scanning, Validate, Tif2PDF, and Preval,
 * both ONGOING and COMPLETED. Filtered to "New Process Only" (IsRework = 'False')
 * so the dashboard/Checkpoints Scan card matches the Scan Manager grid when the
 * "New Process Only" checkbox is checked.
 *
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @param {'mustang'|'jaguar'} [location='mustang']
 */