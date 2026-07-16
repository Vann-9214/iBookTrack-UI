/**
 * services/simflex-db.js
 *
 * Queries the Simflex WMS (Warehouse Management System) via its REST API.
 * Simflex tracks the scanning pipeline status of every ISBN (Scanning,
 * Preval, Tif2PDF, Validate, Transmission_Archive, etc.).
 *
 * All date parameters are sanitized through safeDate() before being
 * embedded in SQL strings to prevent SQL injection.
 *
 * Required environment variables:
 *   SIMFLEX_API_URL          — Full URL to the Simflex SOAP/REST endpoint
 *   SIMFLEX_API_KEY          — API key issued by Simflex
 *   SIMFLEX_MUSTANG_CONFIG   — Config identifier for Mustang (MDE)
 *   SIMFLEX_JAGUAR_CONFIG    — Config identifier for Jaguar (US) — optional
 */

import axios from 'axios'
import https from 'https'
import dotenv from 'dotenv'
dotenv.config({ path: new URL('../.env', import.meta.url) })

// Keep-alive agent so the TCP connection is reused across requests.
// Cap the number of concurrent and idle sockets to avoid exhausting the
// process file-descriptor / memory budget when the frontend polls heavily.
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 20,
  maxFreeSockets: 10,
})

// ── Configuration — read from .env ────────────────────────────────────────────
const SIMFLEX_API_URL = process.env.SIMFLEX_API_URL
const SIMFLEX_API_KEY = process.env.SIMFLEX_API_KEY
const SIMFLEX_MUSTANG_CONFIG = process.env.SIMFLEX_MUSTANG_CONFIG
const SIMFLEX_JAGUAR_CONFIG  = process.env.SIMFLEX_JAGUAR_CONFIG

if (!SIMFLEX_API_URL || !SIMFLEX_API_KEY || (!SIMFLEX_MUSTANG_CONFIG && !SIMFLEX_JAGUAR_CONFIG)) {
  throw new Error('SIMFLEX configuration is missing in environment variables.')
}

// Default to Mustang. A future UI toggle can pass 'jaguar' to switch configs.
function getSimflexConfig(location = 'mustang') {
  const config = location === 'jaguar' ? SIMFLEX_JAGUAR_CONFIG : SIMFLEX_MUSTANG_CONFIG
  return config || SIMFLEX_MUSTANG_CONFIG || SIMFLEX_JAGUAR_CONFIG
}

const SIMFLEX_CONFIG = getSimflexConfig()

// Sentinel value used by the frontend to request books with no machine name.
const NONE_MACHINE = '__NONE__'

// ── Date sanitizer ────────────────────────────────────────────────────────────
/**
 * Converts any date-like value to a safe 'YYYY-MM-DD' string.
 * Throws if the result is not a valid date, preventing any possibility
 * of SQL injection via date parameters.
 *
 * @param {string|Date} value
 * @returns {string} e.g. '2026-06-29'
 */
function safeDate(value) {
  const iso = new Date(value).toISOString().split('T')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`Invalid date value: ${value}`)
  }
  return iso
}

// ── Status normalization ─────────────────────────────────────────────────────
/**
 * Normalize Simflex status strings so the Transmission Monitor matches the
 * legacy tool. Jaguar-specific statuses are folded into the standard stage.
 * QA rows are excluded from the monitored workflow.
 */
function normalizeStatus(status) {
  if (!status) return status
  // The workflow uses Jaguar Validate; fold plain "Validate" into it
  if (status === 'Validate') return 'Jaguar Validate'
  if (status.startsWith('Validate ')) return status.replace('Validate ', 'Jaguar Validate ')
  return status
}

function isMonitoredStatus(status) {
  if (!status) return true
  // QA is not part of the legacy transmission workflow
  return !status.startsWith('QA ') && status !== 'QA'
}

// ── Core query helper ─────────────────────────────────────────────────────────
/**
 * Sends a raw SQL script string to the Simflex API and returns the result rows.
 * Simflex returns [[row, row, ...]] — we unwrap the outer array automatically.
 *
 * @param {string} script    - SQL SELECT statement (no DDL/DML allowed by API)
 * @param {string} [location] - 'mustang' (default) | 'jaguar' — selects the Simflex config
 * @returns {Array} rows
 */
async function query(script, location = 'mustang', attempt = 1) {
  const config = getSimflexConfig(location)
  try {
    const response = await axios.get(SIMFLEX_API_URL, {
      params: { apiKey: SIMFLEX_API_KEY, config, script },
      timeout: 20000,
      httpsAgent,
    })
    // Response is [[row, row, ...]] — unwrap first array
    const data = response.data
    if (data && Array.isArray(data) && Array.isArray(data[0])) return data[0]
    return data
  } catch (err) {
    // Retry once on network-level errors (ECONNRESET, ETIMEDOUT, socket hang up)
    // which happen after the connection has been idle for a while.
    const isNetworkError = err.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE', 'ECONNREFUSED'].includes(err.code)
    if (isNetworkError && attempt === 1) {
      console.warn(`Simflex query network error (${err.code}), retrying once…`)
      return query(script, location, 2)
    }
    throw err
  }
}

// ── Machine ID map ────────────────────────────────────────────────────────────
/**
 * Maps scanner machine hostnames (as stored in Simflex) to their physical
 * scanner machine IDs (barcoded on the hardware).
 * Used to display human-readable machine IDs in reports.
 */
const MACHINE_ID_MAP = {
  'INNO_129367-2':   'A-1081125000079',
  'INNO_129367-1':   'A-1081125000080',
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

// ── Location-based machine filters ───────────────────────────────────────────
// Jaguar hostnames are those whose physical IDs start with JF4 (as per MACHINE_ID_MAP above).
const JAGUAR_MACHINE_HOSTNAMES = Object.keys(MACHINE_ID_MAP).filter(
  h => MACHINE_ID_MAP[h].startsWith('JF4')
)
// Mustang hostnames = everything in the map that is NOT Jaguar
const MUSTANG_MACHINE_HOSTNAMES = Object.keys(MACHINE_ID_MAP).filter(
  h => !MACHINE_ID_MAP[h].startsWith('JF4')
)

const JAGUAR_SQL_LIST  = JAGUAR_MACHINE_HOSTNAMES.map(m => `'${m}'`).join(',')
const MUSTANG_SQL_LIST = MUSTANG_MACHINE_HOSTNAMES.map(m => `'${m}'`).join(',')

/**
 * Returns a SQL WHERE fragment that restricts rows to the given location's
 * known scanner machines.  Unknown/unlisted machines are excluded from both
 * locations so they don't inflate counts in either view.
 *
 * @param {'mustang'|'jaguar'} [location='mustang']
 */
function machineFilter(location = 'mustang') {
  if (location === 'jaguar') return `ScanMachineName IN (${JAGUAR_SQL_LIST})`
  return `ScanMachineName IN (${MUSTANG_SQL_LIST})`
}

// ── New-process-only filter ───────────────────────────────────────────────────
/**
 * Returns an optional SQL AND clause that restricts to non-rework books.
 * When newProcessOnly is true, appends "AND IsRework = 0".
 * @param {boolean} [newProcessOnly=false]
 */
function reworkFilter(newProcessOnly = false) {
  return newProcessOnly ? ' AND IsRework = 0' : ''
}

// ── Exported query functions ──────────────────────────────────────────────────

/**
 * Get today's scanning statistics (or a custom date range) from zeusz_IsbnStatus.
 * Returns counts of total / completed / failed / ongoing by status.
 *
 * @param {string} [startDate] - ISO date string e.g. '2026-06-01'
 * @param {string} [endDate]   - ISO date string e.g. '2026-06-29'
 */
/**
 * Daily Output count — total distinct ISBNs that have reached any COMPLETED
 * status today (Scanning COMPLETED through Transmission_Archive COMPLETED).
 * This is the "books processed today" figure shown on the dashboard.
 *
 * @param {string} [date] - ISO date string; defaults to today
 * @param {'mustang'|'jaguar'} [location='mustang']
 */
export async function getDailyOutputCount(date, location = 'mustang') {
  try {
    const d = date ? safeDate(date) : new Date().toISOString().split('T')[0]
    // Count distinct ISBNs whose LATEST status is Transmission_Archive COMPLETED
    // and that final status was recorded today (filter by Updated, not ScanDate,
    // because ScanDate is set when the book is first scanned and never changes).
    const rows = await query(
      `SELECT COUNT(DISTINCT t.ISBN) AS cnt
       FROM zeusz_IsbnStatus t
       INNER JOIN (
         SELECT ISBN, MAX(Updated) AS MaxUpdated
         FROM zeusz_IsbnStatus
         GROUP BY ISBN
       ) latest ON t.ISBN = latest.ISBN AND t.Updated = latest.MaxUpdated
       WHERE t.Status = 'Transmission_Archive COMPLETED'
         AND CAST(t.Updated AS DATE) = '${d}'`,
      location
    )
    const data = Array.isArray(rows) ? rows : []
    return { success: true, count: data[0]?.cnt || 0 }
  } catch (error) {
    console.error('Error fetching daily output count:', error)
    return { success: false, count: 0 }
  }
}

export async function getDailyOutputRows(date, location = 'mustang', newProcessOnly = false) {
  try {
    const d = date ? safeDate(date) : new Date().toISOString().split('T')[0]
    const reworkFilter = newProcessOnly ? "AND IsRework = 'False'" : ""

    // Match the dashboard card count: latest status per ISBN added today is
    // Transmission_Archive COMPLETED, with optional New Process Only filter.
    const rows = await query(
      `SELECT t.ISBN, t.Updated, t.ScanUser, t.BoxNumber, t.PageCount, t.ScanDate
       FROM zeusz_IsbnStatus t
       INNER JOIN (
         SELECT ISBN, MAX(Updated) AS MaxUpdated
         FROM zeusz_IsbnStatus
         WHERE CAST(DateAdded AS DATE) = '${d}' ${reworkFilter}
         GROUP BY ISBN
       ) latest ON t.ISBN = latest.ISBN AND t.Updated = latest.MaxUpdated
       WHERE t.Status = 'Transmission_Archive COMPLETED'
         ${reworkFilter}
         AND CAST(DateAdded AS DATE) = '${d}'
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
    console.error('Error fetching daily output rows:', error)
    return { success: false, rows: [] }
  }
}

export async function getTodayScanningSummary(startDate, endDate, location = 'mustang', newProcessOnly = false) {
  try {
    const dateWhere = startDate && endDate
      ? `CAST(DateAdded AS DATE) BETWEEN '${safeDate(startDate)}' AND '${safeDate(endDate)}'`
      : `CAST(DateAdded AS DATE) = CAST(GETDATE() AS DATE)`

    const rows = await query(
      `SELECT Status, COUNT(*) AS cnt FROM zeusz_IsbnStatus WHERE ${dateWhere}${reworkFilter(newProcessOnly)} GROUP BY Status ORDER BY cnt DESC`,
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
    console.error('Error fetching scanning summary:', error)
    return { success: false, error: error.message }
  }
}

/**
 * For a list of ISBNs, return the latest Simflex row per ISBN that has a
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
  const chunkSize = 1000
  for (let i = 0; i < isbns.length; i += chunkSize) {
    const chunk = isbns.slice(i, i + chunkSize)
    const safelist = chunk
      .map(isbn => `'${String(isbn).replace(/[^a-zA-Z0-9\-]/g, '')}'`)
      .join(',')

    const rows = await query(
      `SELECT t.ISBN, t.ScanMachineName AS ScanMachineName, t.ScanUser
       FROM zeusz_IsbnStatus t
       INNER JOIN (
         SELECT ISBN, MAX(Updated) AS MaxUpdated
         FROM zeusz_IsbnStatus
         WHERE ISBN IN (${safelist})
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
    const rows = await query(
      `SELECT TOP 100 ISBN, Status, ScanMachineName AS MachineName, ScanDate, Updated, PageCount, ScanUser, BoxNumber, IsRework
       FROM zeusz_IsbnStatus
       WHERE CAST(DateAdded AS DATE) BETWEEN '${start}' AND '${end}'${reworkFilter(newProcessOnly)}
       ORDER BY Updated DESC`,
      location
    )
    const data = (Array.isArray(rows) ? rows : [])
      .map(r => ({ ...r, Status: normalizeStatus(r.Status) }))
      .filter(r => isMonitoredStatus(r.Status))
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching scanning data:', error)
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
      ? `CAST(DateAdded AS DATE) BETWEEN '${safeDate(startDate)}' AND '${safeDate(endDate)}'`
      : `CAST(DateAdded AS DATE) = CAST(GETDATE() AS DATE)`

    const rows = await query(
      `SELECT ScanMachineName AS MachineName, COUNT(*) AS TotalScans
       FROM zeusz_IsbnStatus
       WHERE ${dateWhere} AND Status NOT LIKE '%FAILED%'${reworkFilter(newProcessOnly)}
       GROUP BY ScanMachineName
       ORDER BY TotalScans DESC`,
      location
    )
    const data = (Array.isArray(rows) ? rows : []).map(r => ({
      MachineName: r.MachineName,
      MachineID: MACHINE_ID_MAP[r.MachineName] || r.MachineName,
      TotalScans: r.TotalScans,
    }))
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching machine stats:', error)
    return { success: false, error: error.message }
  }
}

export async function getBooksByMachine(startDate, endDate, machineName, location = 'mustang', newProcessOnly = false) {
  try {
    const dateWhere = startDate && endDate
      ? `CAST(DateAdded AS DATE) BETWEEN '${safeDate(startDate)}' AND '${safeDate(endDate)}'`
      : `CAST(DateAdded AS DATE) = CAST(GETDATE() AS DATE)`
    const isNoneMachine = String(machineName).trim() === NONE_MACHINE
    const machineWhere = isNoneMachine
      ? `(ScanMachineName IS NULL OR LTRIM(RTRIM(ScanMachineName)) = '')`
      : `ScanMachineName = '${String(machineName).replace(/'/g, "''")}'`
    const rows = await query(
      `SELECT TOP 5000 ISBN, Status, Updated, ScanDate, ScanUser
       FROM zeusz_IsbnStatus
       WHERE ${dateWhere} AND ${machineWhere}
         AND Status NOT LIKE '%FAILED%'${reworkFilter(newProcessOnly)}
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
    console.error('Error fetching machine books:', error)
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
      ? `CAST(DateAdded AS DATE) BETWEEN '${safeDate(startDate)}' AND '${safeDate(endDate)}'`
      : `CAST(DateAdded AS DATE) = CAST(GETDATE() AS DATE)`

    // Fetch all rows for the location and date range, then deduplicate by latest
    // status per ISBN in JavaScript (Simflex API does not support window functions).
    const rows = await query(
      `SELECT TOP 10000 ISBN, Status, Updated FROM zeusz_IsbnStatus WHERE ${dateWhere}${reworkFilter(newProcessOnly)} ORDER BY Updated DESC`,
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
    console.error('Error fetching stage stats:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get the all-time total scan count from Simflex.
 * Used to display a "grand total scanned" figure on the dashboard.
 */
export async function getTotalScansAllTime() {
  try {
    const rows = await query(`SELECT COUNT(*) AS Total FROM zeusz_IsbnStatus WHERE Status NOT LIKE '%FAILED%'`)
    const data = Array.isArray(rows) ? rows : []
    return { success: true, total: data[0]?.Total || 0 }
  } catch (error) {
    console.error('Error fetching all-time total:', error)
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
    const rows = await query(
      `SELECT ScanUser, COUNT(*) AS Books, SUM(PageCount) AS Pages
       FROM zeusz_IsbnStatus
       WHERE CAST(ScanDate AS DATE) = '${d}' AND ScanUser IS NOT NULL AND Status NOT LIKE '%FAILED%'
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
    console.error('Error fetching ranking:', error)
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
    const rows = await query(
      `SELECT TOP 5000 ScanDate, ScanUser, BoxNumber, ISBN, PageCount, Status, ScanMachineName AS Machine, Updated
       FROM zeusz_IsbnStatus
       WHERE CAST(ScanDate AS DATE) = '${d}'
       ORDER BY Updated DESC`,
      location
    )
    return { success: true, data: Array.isArray(rows) ? rows : [] }
  } catch (error) {
    console.error('Error fetching export data:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Dashboard Scan stage (step 5) — counts distinct ISBNs in any of the
 * pre-transmission statuses: Scanning, Validate, Tif2PDF, and Preval,
 * both ONGOING and COMPLETED. Filtered to "New Process Only" (IsRework = 'False')
 * so the dashboard/Checkpoints Scan card matches the Simflex grid when the
 * "New Process Only" checkbox is checked.
 *
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @param {'mustang'|'jaguar'} [location='mustang']
 */
export async function getScanStageBoxes(startDate, endDate, location = 'mustang') {
  try {
    const scanStatuses = `('Scanning ONGOING', 'Scanning COMPLETED', 'Validate ONGOING', 'Validate COMPLETED', 'Jaguar Validate ONGOING', 'Jaguar Validate COMPLETED', 'Tif2PDF ONGOING', 'Tif2PDF COMPLETED', 'Preval ONGOING', 'Preval COMPLETED')`
    // Note: both Validate and Jaguar Validate are included; they are normalized
    // to Jaguar Validate after the query so the count matches the legacy tool.

    // Default to today's scan-stage rows using an explicit ISO date.
    // Simflex's API does not evaluate GETDATE() correctly when the SQL is
    // passed as a URL parameter, so we use the backend's current date instead.
    const today = new Date().toISOString().split('T')[0]
    const dateFilter = startDate && endDate
      ? `CAST(ScanDate AS DATE) BETWEEN '${safeDate(startDate)}' AND '${safeDate(endDate)}'`
      : `CAST(ScanDate AS DATE) = '${today}'`

    // New-Process-Only filter: matches the Simflex grid when the checkbox is checked.
    // IsRework = 'False' means the book is not a rework, i.e., a new process book.
    const newProcessFilter = `AND IsRework = 'False'`

    // Count distinct books (ISBNs) currently in the scan-stage WIP range.
    const countRows = await query(
      `SELECT COUNT(DISTINCT LTRIM(RTRIM(ISBN))) AS cnt
       FROM zeusz_IsbnStatus
       WHERE ${dateFilter}
         AND LTRIM(RTRIM(Status)) IN ${scanStatuses}
         ${newProcessFilter}`,
      location
    )
    const count = (Array.isArray(countRows) ? countRows : [])[0]?.cnt || 0

    // Detail rows for the modal — still filtered to New Process Only so the
    // Simflex list matches the card count.  Keep only the latest row per ISBN
    // so the modal row count matches the distinct-ISBN count.
    const rows = await query(
      `SELECT ISBN, BoxNumber, ScanUser, ScanMachineName AS MachineName,
              PageCount, ScanDate, Status, Updated AS LastUpdated
       FROM zeusz_IsbnStatus
       WHERE ${dateFilter}
         AND LTRIM(RTRIM(Status)) IN ${scanStatuses}
         ${newProcessFilter}
       ORDER BY Updated DESC`,
      location
    )

    const rawData = (Array.isArray(rows) ? rows : [])
      .map(r => ({ ...r, Status: normalizeStatus(r.Status) }))
      .filter(r => isMonitoredStatus(r.Status))
    const seen = new Set()
    const data = []
    for (const row of rawData) {
      const isbn = String(row.ISBN || '').trim()
      if (!isbn || seen.has(isbn)) continue
      seen.add(isbn)
      data.push(row)
    }

    console.log('[getScanStageBoxes] dateFilter:', dateFilter, '| newProcess=checked | count=', count, '| raw rows=', rawData.length, '| deduplicated=', data.length)

    return { success: true, count, data }
  } catch (error) {
    console.error('Error fetching scan stage boxes:', error)
    return { success: false, error: error.message, count: 0, data: [] }
  }
}

/**
 * Dashboard Transmit stage (step 6) — counts boxes currently transmitting
 * (Transmission_Archive ONGOING).
 *
 * @param {string} [startDate]
 * @param {string} [endDate]
 */
export async function getTransmitStageBoxes(startDate, endDate, location = 'mustang') {
  try {
    const today = new Date().toISOString().split('T')[0]
    const dateFilter = startDate && endDate
      ? `CAST(ScanDate AS DATE) BETWEEN '${safeDate(startDate)}' AND '${safeDate(endDate)}'`
      : `CAST(ScanDate AS DATE) = '${today}'`

    // Count distinct BoxNumbers that have ANY ISBN with Transmission_Archive ONGOING today.
    const countRows = await query(
      `SELECT COUNT(DISTINCT BoxNumber) AS cnt
       FROM zeusz_IsbnStatus
       WHERE ${dateFilter}
         AND BoxNumber IS NOT NULL AND BoxNumber <> ''
         AND Status = 'Transmission_Archive ONGOING'`,
      location
    )
    const count = (Array.isArray(countRows) ? countRows : [])[0]?.cnt || 0

    // Detail rows: individual ISBNs
    const rows = await query(
      `SELECT ISBN, BoxNumber, Status, Updated AS LastUpdated
       FROM zeusz_IsbnStatus s
       WHERE ${dateFilter}
         AND BoxNumber IS NOT NULL AND BoxNumber <> ''
         AND Status = 'Transmission_Archive ONGOING'
         AND Updated = (
           SELECT MAX(Updated) FROM zeusz_IsbnStatus
           WHERE ISBN = s.ISBN AND ${dateFilter}
         )
       ORDER BY Updated DESC`,
      location
    )

    const data = Array.isArray(rows) ? rows : []
    return { success: true, count, data }
  } catch (error) {
    console.error('Error fetching transmit stage boxes:', error)
    return { success: false, error: error.message, count: 0, data: [] }
  }
}

/**
 * Get the latest Simflex scan status for a list of ISBNs.
 * Specifically detects whether each ISBN has reached
 * "Transmission_Archive COMPLETED" — the final pipeline stage.
 *
 * ISBNs not found in Simflex are returned with transmissionCompleted: false.
 *
 * @param {string[]} isbns
 * @param {'mustang'|'jaguar'} [location='mustang']
 * @returns {{ success: boolean, data: Array<{
 *   isbn: string,
 *   transmissionCompleted: boolean,
 *   latestStatus: string|null,
 *   latestUpdated: string|null,
 *   boxNumber: string|null,
 *   scanUser: string|null,
 *   statuses: string[]
 * }> }}
 */
export async function getSimflexStatusForISBNs(isbns, location = 'mustang') {
  try {
    if (!isbns || isbns.length === 0) return { success: true, data: [] }

    // Build a safe SQL IN list — strip any non-alphanumeric/hyphen characters
    // from each ISBN to prevent injection via the isbn values themselves.
    const safelist = isbns
      .map(i => `'${String(i).replace(/[^a-zA-Z0-9\-]/g, '')}'`)
      .join(',')

    // Fetch all status rows for these ISBNs across all time (not just today)
    const rows = await query(
      `SELECT ISBN, Status, ScanDate, Updated, PageCount, ScanUser, BoxNumber
       FROM zeusz_IsbnStatus
       WHERE ISBN IN (${safelist})
       ORDER BY Updated DESC`,
      location
    )

    const data = Array.isArray(rows) ? rows : []

    // Group by ISBN to build a per-ISBN summary
    const byIsbn = {}
    data.forEach(r => {
      const isbn = r.ISBN
      const status = normalizeStatus(r.Status)
      if (!byIsbn[isbn]) {
        byIsbn[isbn] = {
          isbn,
          statuses:             [],
          transmissionCompleted: false,
          latestStatus:          null,
          latestUpdated:         null,
          boxNumber:             r.BoxNumber || null,
          scanUser:              r.ScanUser  || null,
        }
      }
      byIsbn[isbn].statuses.push(status)

      // Flag as transmission-complete if any row shows Transmission_Archive COMPLETED
      if (
        status &&
        status.toLowerCase().includes('transmission_archive') &&
        status.toUpperCase().includes('COMPLETED')
      ) {
        byIsbn[isbn].transmissionCompleted = true
      }

      // Keep track of the most recent status row
      if (!byIsbn[isbn].latestUpdated || new Date(r.Updated) > new Date(byIsbn[isbn].latestUpdated)) {
        byIsbn[isbn].latestStatus  = status
        byIsbn[isbn].latestUpdated = r.Updated
        byIsbn[isbn].boxNumber     = r.BoxNumber || byIsbn[isbn].boxNumber
        byIsbn[isbn].scanUser      = r.ScanUser  || byIsbn[isbn].scanUser
      }
    })

    // Ensure every requested ISBN appears in the result (even if not in Simflex yet)
    isbns.forEach(isbn => {
      if (!byIsbn[isbn]) {
        byIsbn[isbn] = {
          isbn,
          statuses:             [],
          transmissionCompleted: false,
          latestStatus:          null,
          latestUpdated:         null,
          boxNumber:             null,
          scanUser:              null,
        }
      }
    })

    return { success: true, data: Object.values(byIsbn) }
  } catch (error) {
    console.error('Error fetching Simflex status for ISBNs:', error)
    return { success: false, error: error.message, data: [] }
  }
}

/**
 * Count books added in the requested date range (for the given location) whose
 * latest Simflex status is Transmission_Archive COMPLETED.
 *
 * Matches the legacy tool logic:
 *   - Date filter on DateAdded (the day the ISBN was registered in Simflex)
 *   - Uses the correct Simflex config (database) per location — no machine hostname filter needed
 *   - Deduplicates by latest-status-per-ISBN in JavaScript (Simflex API has no window functions)
 *
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @param {'mustang'|'jaguar'} [location='mustang']
 */
export async function getCompletedTransmissionsCount(startDate, endDate, location = 'mustang', newProcessOnly = false) {
  try {
    const dateFilter = startDate && endDate
      ? `CAST(DateAdded AS DATE) BETWEEN '${safeDate(startDate)}' AND '${safeDate(endDate)}'`
      : `CAST(DateAdded AS DATE) = CAST(GETDATE() AS DATE)`

    const rows = await query(
      `SELECT TOP 5000 ISBN, Status, Updated FROM zeusz_IsbnStatus WHERE ${dateFilter}${reworkFilter(newProcessOnly)} ORDER BY Updated DESC`,
      location
    )
    const data = Array.isArray(rows) ? rows : []

    // Resolve the latest status per ISBN so duplicate/historical rows are not double-counted
    const latestByIsbn = new Map()
    for (const r of data) {
      const isbn = r.ISBN
      if (!isbn) continue
      const existing = latestByIsbn.get(isbn)
      if (!existing || new Date(r.Updated) > new Date(existing.Updated)) {
        latestByIsbn.set(isbn, r)
      }
    }

    const completed = [...latestByIsbn.values()].filter(
      r => r.Status === 'Transmission_Archive COMPLETED'
    ).length

    return { success: true, count: completed }
  } catch (error) {
    console.error('Error fetching completed transmissions count:', error)
    return { success: false, count: 0, error: error.message }
  }
}

/**
 * Return the full deduplicated list of ISBNs added today (or in a date range),
 * enriched with their latest Simflex status.
 * Used to power the Books / WIP toggle on the Transmission Monitor live feed.
 *
 * Each row: { ISBN, Status, Updated, ScanUser, ScanMachineName, BoxNumber, PageCount, ScanDate, isWip }
 *
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @param {'mustang'|'jaguar'} [location='mustang']
 * @param {boolean} [newProcessOnly=false] - when true, filters IsRework=0 (mirrors the checkbox)
 */
export async function getAllBooksToday(startDate, endDate, location = 'mustang', newProcessOnly = false) {
  try {
    const dateFilter = startDate && endDate
      ? `CAST(DateAdded AS DATE) BETWEEN '${safeDate(startDate)}' AND '${safeDate(endDate)}'`
      : `CAST(DateAdded AS DATE) = CAST(GETDATE() AS DATE)`

    const rows = await query(
      `SELECT TOP 5000 ISBN, Status, Updated, ScanUser, ScanMachineName, BoxNumber, PageCount, ScanDate` +
      ` FROM zeusz_IsbnStatus WHERE ${dateFilter}${reworkFilter(newProcessOnly)} ORDER BY Updated DESC`,
      location
    )
    const data = (Array.isArray(rows) ? rows : [])
      .map(r => ({ ...r, Status: normalizeStatus(r.Status) }))
      .filter(r => isMonitoredStatus(r.Status))

    // Deduplicate: keep latest status per ISBN
    const latestByIsbn = new Map()
    for (const r of data) {
      if (!r.ISBN) continue
      const existing = latestByIsbn.get(r.ISBN)
      if (!existing || new Date(r.Updated) > new Date(existing.Updated)) {
        latestByIsbn.set(r.ISBN, r)
      }
    }

    let books = [...latestByIsbn.values()].map(r => ({
      ...r,
      isWip: r.Status !== 'Transmission_Archive COMPLETED',
    }))

    // Sort: WIP first (ONGOING before COMPLETED non-TA), then transmitted
    books.sort((a, b) => {
      if (a.isWip && !b.isWip) return -1
      if (!a.isWip && b.isWip) return 1
      return new Date(b.Updated) - new Date(a.Updated)
    })

    // Enrich with the real machine/user from the latest Simflex scan event
    // for each ISBN. The latest status row may not have either value populated,
    // so we look back for the newest row with a machine or user.
    const isbns = books.map(b => b.ISBN).filter(Boolean)
    const machineUserMap = await getLatestMachineUserForISBNs(isbns, location)
    books = books.map(b => ({
      ...b,
      ScanMachineName: machineUserMap[b.ISBN]?.ScanMachineName || b.ScanMachineName || null,
      ScanUser: machineUserMap[b.ISBN]?.ScanUser || b.ScanUser || null,
    }))

    const totalBooks = books.length
    const wipCount   = books.filter(b => b.isWip).length

    return { success: true, books, totalBooks, wipCount }
  } catch (error) {
    console.error('Error fetching all books today:', error)
    return { success: false, books: [], totalBooks: 0, wipCount: 0, error: error.message }
  }
}

/**
 * Full Simflex rows for Transmission_Archive ONGOING today (New Process Only).
 * Returns ScanDate, ScanUser, BoxNumber, ISBN, PageCount, Status, Updated.
 *
 * @param {'mustang'|'jaguar'} [location='mustang']
 */
export async function getTransmitStageRows(location = 'mustang') {
  try {
    const today = new Date().toISOString().split('T')[0]
    const rows = await query(
      `SELECT ScanDate, ScanUser, BoxNumber, ISBN, PageCount, Status, Updated
       FROM zeusz_IsbnStatus
       WHERE CAST(ScanDate AS DATE) = '${today}'
         AND LTRIM(RTRIM(Status)) = 'Transmission_Archive ONGOING'
         AND IsRework = 'False'
       ORDER BY Updated DESC`,
      location
    )
    const data = Array.isArray(rows) ? rows : []
    return { success: true, count: data.length, data }
  } catch (error) {
    console.error('Error fetching transmit stage rows:', error)
    return { success: false, error: error.message, count: 0, data: [] }
  }
}

export default {
  getDailyOutputCount,
  getDailyOutputRows,
  getTodayScanningSummary,
  getScanningData,
  getScanningByMachine,
  getBooksByMachine,
  getScanningByStage,
  getScanningRanking,
  getScanningExportData,
  getTotalScansAllTime,
  getSimflexStatusForISBNs,
  getScanStageBoxes,
  getTransmitStageBoxes,
  getTransmitStageRows,
  getCompletedTransmissionsCount,
  getAllBooksToday,
}
