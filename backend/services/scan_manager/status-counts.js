import { logger } from '../../utils/logger.js'
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
const SIMFLEX_API_URL        = process.env.SIMFLEX_API_URL
const SIMFLEX_API_KEY        = process.env.SIMFLEX_API_KEY
const SIMFLEX_MUSTANG_CONFIG = process.env.SIMFLEX_MUSTANG_CONFIG
const SIMFLEX_JAGUAR_CONFIG  = process.env.SIMFLEX_JAGUAR_CONFIG

if (!SIMFLEX_API_URL || !SIMFLEX_API_KEY || (!SIMFLEX_MUSTANG_CONFIG && !SIMFLEX_JAGUAR_CONFIG)) {
  throw new Error('SIMFLEX configuration is missing in environment variables.')
}

function getSimflexConfig(location = 'mustang') {
  return location === 'jaguar' ? SIMFLEX_JAGUAR_CONFIG : SIMFLEX_MUSTANG_CONFIG
}

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 20,
  maxFreeSockets: 10,
})

// ── Date sanitizer ────────────────────────────────────────────────────────────
function safeDate(value) {
  const iso = new Date(value).toISOString().split('T')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error(`Invalid date: ${value}`)
  return iso
}

// ── Core query ────────────────────────────────────────────────────────────────
async function query(script, location = 'mustang', attempt = 1) {
  try {
    const response = await axios.get(SIMFLEX_API_URL, {
      params: { apiKey: SIMFLEX_API_KEY, config: getSimflexConfig(location), script },
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
      return query(script, location, 2)
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
  { stage: 'Jaguar Validate',      label: 'Jaguar Validate'  },
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
 * @param {'mustang'|'jaguar'} [location='mustang']
 * @returns {Promise<{
 *   success: boolean,
 *   stages: Array<{
 *     stage: string, label: string,
 *     Completed: number, Ongoing: number, Failed: number, Total: number
 *   }>
 * }>}
 */
export async function getStageCounts(startDate, endDate, location = 'mustang') {
  try {
    const dateFilter = startDate && endDate
      ? `CAST(DateAdded AS DATE) BETWEEN '${safeDate(startDate)}' AND '${safeDate(endDate)}'`
      : `CAST(DateAdded AS DATE) = CAST(GETDATE() AS DATE)`

    // Fetch all rows added today (or in range), then resolve the latest status per ISBN.
    // Using DateAdded means status updates that happened today are included even if the
    // book was first scanned on an earlier day. Deduplicating by Updated ensures the
    // count reflects the current status, not a stale historical row.
    const rows = await query(
      `SELECT TOP 5000 ISBN, Status, Updated
       FROM zeusz_IsbnStatus
       WHERE ${dateFilter}
         AND Status IS NOT NULL AND Status <> ''
         AND IsRework = 'False'
       ORDER BY Updated DESC`,
      location
    )

    const data = Array.isArray(rows) ? rows : []

    // Resolve latest row per ISBN
    const latestByIsbn = new Map()
    for (const r of data) {
      const isbn = String(r.ISBN || '').trim()
      if (!isbn) continue
      const existing = latestByIsbn.get(isbn)
      if (!existing || new Date(r.Updated) > new Date(existing.Updated)) {
        latestByIsbn.set(isbn, r)
      }
    }

    // Build a lookup: stageName → { Completed, Ongoing, Failed }
    const lookup = {}
    for (const r of latestByIsbn.values()) {
      const status = String(r.Status || '').trim()
      if (!status) continue

      let keyword = ''
      if (status.endsWith('COMPLETED')) keyword = 'COMPLETED'
      else if (status.endsWith('ONGOING')) keyword = 'ONGOING'
      else if (status.endsWith('FAILED')) keyword = 'FAILED'
      else continue

      const stageName = status.slice(0, status.length - keyword.length).trim()
      if (!stageName) continue

      if (!lookup[stageName]) lookup[stageName] = { Completed: 0, Ongoing: 0, Failed: 0 }
      if      (keyword === 'COMPLETED') lookup[stageName].Completed += 1
      else if (keyword === 'ONGOING')   lookup[stageName].Ongoing   += 1
      else if (keyword === 'FAILED')    lookup[stageName].Failed    += 1
    }

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
    logger.error('[pipeline-counts] Error:', error.message)
    return {
      success: false,
      error: error.message,
      stages: STAGE_DEFINITIONS.map(({ stage, label }) => ({
        stage, label, Completed: 0, Ongoing: 0, Failed: 0, Total: 0,
      })),
    }
  }
}

export default { getStageCounts, STAGE_DEFINITIONS }
