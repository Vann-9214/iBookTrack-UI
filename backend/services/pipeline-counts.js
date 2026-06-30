/**
 * services/pipeline-counts.js
 *
 * Sole purpose: query Simflex and return per-stage ISBN counts for today
 * (or a custom date range).
 *
 * Simflex status format:  "<StageName> <KEYWORD>"
 *   KEYWORD = COMPLETED | ONGOING | FAILED
 *
 * Active stage groups tracked here:
 *   ┌─────────────────────┬──────────────────────────────────────────────────┐
 *   │ Simflex stage key   │ Statuses                                         │
 *   ├─────────────────────┼──────────────────────────────────────────────────┤
 *   │ Scanning            │ Scanning COMPLETED / ONGOING / FAILED            │
 *   │ Validate            │ Validate COMPLETED / ONGOING / FAILED            │
 *   │ Tif2PDF             │ Tif2PDF COMPLETED  / ONGOING / FAILED            │
 *   │ Preval              │ Preval COMPLETED   / ONGOING / FAILED            │
 *   │ Transmission_Archive│ Transmission_Archive COMPLETED / ONGOING / FAILED│
 *   └─────────────────────┴──────────────────────────────────────────────────┘
 *
 * Each stage object in the response:
 *   {
 *     stage:     string,  // Simflex key, e.g. "Tif2PDF"
 *     label:     string,  // UI label,    e.g. "PDF Conversion"
 *     Completed: number,
 *     Ongoing:   number,
 *     Failed:    number,
 *     Total:     number   // Completed + Ongoing  (FAILED excluded from Total)
 *   }
 *
 * To add more stage groups later, simply add an entry to STAGE_DEFINITIONS.
 */

import axios from 'axios'
import https from 'https'
import dotenv from 'dotenv'
dotenv.config({ path: new URL('../.env', import.meta.url) })

// ── Simflex connection ────────────────────────────────────────────────────────
const SIMFLEX_API_URL    = process.env.SIMFLEX_API_URL    || 'https://simflex.innodata.com/wms.services/WMS.Services.asmx/TechGetDatabaseDataset'
const SIMFLEX_API_KEY    = process.env.SIMFLEX_API_KEY    || ''
const SIMFLEX_CONFIG     = process.env.SIMFLEX_MUSTANG_CONFIG || process.env.SIMFLEX_JAGUAR_CONFIG || ''

const httpsAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 30000 })

// ── Date sanitizer ────────────────────────────────────────────────────────────
function safeDate(value) {
  const iso = new Date(value).toISOString().split('T')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error(`Invalid date: ${value}`)
  return iso
}

// ── Core query ────────────────────────────────────────────────────────────────
async function query(script, attempt = 1) {
  try {
    const response = await axios.get(SIMFLEX_API_URL, {
      params: { apiKey: SIMFLEX_API_KEY, config: SIMFLEX_CONFIG, script },
      timeout: 20000,
      httpsAgent,
    })
    const data = response.data
    if (data && Array.isArray(data) && Array.isArray(data[0])) return data[0]
    return data
  } catch (err) {
    const isNetworkError = err.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE', 'ECONNREFUSED'].includes(err.code)
    if (isNetworkError && attempt === 1) {
      console.warn(`[pipeline-counts] Network error (${err.code}), retrying…`)
      return query(script, 2)
    }
    throw err
  }
}

// ── Stage definitions ─────────────────────────────────────────────────────────
// Maps Simflex stage prefix → display label.
// Order here controls the order returned in the response.
//
// ── Active groups (used by Dashboard Scan & Transmit cards) ──────────────────
const STAGE_DEFINITIONS = [
  // Scan pipeline sub-stages
  { stage: 'Scanning',             label: 'Scanning'       },
  { stage: 'Validate',             label: 'Validate'       },
  { stage: 'Tif2PDF',              label: 'PDF Conversion' },
  { stage: 'Preval',               label: 'Preval'         },
  // Transmit stage
  { stage: 'Transmission_Archive', label: 'Transmit'       },

  // ── Add more groups here when needed, e.g.: ─────────────────────────────
  // { stage: 'QC',       label: 'QC'       },
  // { stage: 'Delivery', label: 'Delivery' },
]

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Returns today's per-stage ISBN counts (Completed / Ongoing / Failed / Total).
 * Pass startDate + endDate to override the date range.
 *
 * @param {string} [startDate]  ISO date e.g. '2026-06-30'
 * @param {string} [endDate]    ISO date e.g. '2026-06-30'
 * @returns {Promise<{
 *   success: boolean,
 *   stages: Array<{
 *     stage: string, label: string,
 *     Completed: number, Ongoing: number, Failed: number, Total: number
 *   }>
 * }>}
 */
/**
 * Count total rows in scan-stage statuses today:
 * Scanning ONGOING/COMPLETED, Validate ONGOING/COMPLETED,
 * Tif2PDF ONGOING/COMPLETED, Preval ONGOING/COMPLETED.
 *
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @returns {Promise<{ success: boolean, count: number }>}
 */
export async function getScanBooksCount(startDate, endDate) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const dateFilter = startDate && endDate
      ? `CAST(ScanDate AS DATE) BETWEEN '${safeDate(startDate)}' AND '${safeDate(endDate)}'`
      : `CAST(ScanDate AS DATE) = '${today}'`

    const scanStatuses = `('Scanning ONGOING','Scanning COMPLETED','Validate ONGOING','Validate COMPLETED','Tif2PDF ONGOING','Tif2PDF COMPLETED','Preval ONGOING','Preval COMPLETED')`

    // LTRIM/RTRIM both ISBN and Status before matching — stray whitespace on
    // either column makes COUNT(DISTINCT ISBN) see the same book as multiple
    // distinct values, or silently drops valid rows from the IN() filter.
    const rows = await query(
      `SELECT COUNT(DISTINCT LTRIM(RTRIM(ISBN))) AS cnt
       FROM zeusz_IsbnStatus
       WHERE ${dateFilter}
         AND LTRIM(RTRIM(Status)) IN ${scanStatuses}`
    )
    const count = (Array.isArray(rows) ? rows : [])[0]?.cnt || 0
    return { success: true, count }
  } catch (error) {
    console.error('[pipeline-counts] getScanBooksCount error:', error.message)
    return { success: false, count: 0 }
  }
}

export async function getStageCounts(startDate, endDate) {
  try {
    const dateFilter = startDate && endDate
      ? `CAST(ScanDate AS DATE) BETWEEN '${safeDate(startDate)}' AND '${safeDate(endDate)}'`
      : `CAST(ScanDate AS DATE) = CAST(GETDATE() AS DATE)`

    // Use a CTE to strip the known keyword suffix (COMPLETED/ONGOING/FAILED)
    // from the right of Status, and LTRIM/RTRIM everything, before grouping.
    // The old LEFT/RIGHT/CHARINDEX/REVERSE approach was sensitive to stray
    // whitespace: a doubled space or leading space shifted the split point,
    // producing ' Tif2PDF' vs 'Tif2PDF' as separate GROUP BY buckets —
    // so the same book got counted once per bucket and summed twice.
    const rows = await query(
      `WITH Parsed AS (
         SELECT
           LTRIM(RTRIM(ISBN)) AS ISBN,
           CASE
             WHEN RTRIM(Status) LIKE '%COMPLETED' THEN 'COMPLETED'
             WHEN RTRIM(Status) LIKE '%ONGOING'   THEN 'ONGOING'
             WHEN RTRIM(Status) LIKE '%FAILED'    THEN 'FAILED'
           END AS Keyword,
           LTRIM(RTRIM(
             CASE
               WHEN RTRIM(Status) LIKE '%COMPLETED' THEN LEFT(RTRIM(Status), LEN(RTRIM(Status)) - LEN('COMPLETED'))
               WHEN RTRIM(Status) LIKE '%ONGOING'   THEN LEFT(RTRIM(Status), LEN(RTRIM(Status)) - LEN('ONGOING'))
               WHEN RTRIM(Status) LIKE '%FAILED'    THEN LEFT(RTRIM(Status), LEN(RTRIM(Status)) - LEN('FAILED'))
             END
           )) AS StageName
         FROM zeusz_IsbnStatus
         WHERE ${dateFilter}
           AND Status IS NOT NULL AND Status <> ''
       )
       SELECT StageName, Keyword, COUNT(DISTINCT ISBN) AS cnt
       FROM Parsed
       WHERE StageName <> '' AND Keyword IS NOT NULL
       GROUP BY StageName, Keyword
       ORDER BY StageName, Keyword`
    )

    const data = Array.isArray(rows) ? rows : []

    // Build a lookup: stageName → { Completed, Ongoing, Failed }
    const lookup = {}
    data.forEach(r => {
      const stageName = (r.StageName || '').trim()
      const keyword   = (r.Keyword   || '').trim().toUpperCase()
      if (!stageName) return
      if (!lookup[stageName]) lookup[stageName] = { Completed: 0, Ongoing: 0, Failed: 0 }
      if      (keyword === 'COMPLETED') lookup[stageName].Completed += r.cnt
      else if (keyword === 'ONGOING')   lookup[stageName].Ongoing   += r.cnt
      else if (keyword === 'FAILED')    lookup[stageName].Failed    += r.cnt
    })

    // Build ordered result using STAGE_DEFINITIONS so the order is always consistent
    const stages = STAGE_DEFINITIONS.map(({ stage, label }) => {
      const s = lookup[stage] || { Completed: 0, Ongoing: 0, Failed: 0 }
      return {
        stage,
        label,
        Completed: s.Completed,
        Ongoing:   s.Ongoing,
        Failed:    s.Failed,
        Total:     s.Completed + s.Ongoing,   // FAILED excluded from Total
      }
    })

    return { success: true, stages }
  } catch (error) {
    console.error('[pipeline-counts] Error:', error.message)
    return {
      success: false,
      error: error.message,
      stages: STAGE_DEFINITIONS.map(({ stage, label }) => ({
        stage, label, Completed: 0, Ongoing: 0, Failed: 0, Total: 0,
      })),
    }
  }
}

export default { getStageCounts, getScanBooksCount, STAGE_DEFINITIONS }
