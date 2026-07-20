import { logger } from '../../../utils/logger.js'
/**
 * services/scan_manager-api.js
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

// ── SQL Parameterization ──────────────────────────────────────────────────────
/**
 * A tagged template literal that mimics parameterized queries for the legacy API.
 * Safely escapes strings by doubling single quotes, formats arrays into CSV lists,
 * and leaves numbers/booleans as-is.
 */
export function sql(strings, ...values) {
  let result = strings[0]
  for (let i = 0; i < values.length; i++) {
    let value = values[i]
    
    if (value && typeof value === 'object' && value.__raw) {
      value = value.val
    } else if (typeof value === 'string') {
      value = `'${value.replace(/'/g, "''")}'`
    } else if (value === null || value === undefined) {
      value = 'NULL'
    } else if (value instanceof Date) {
      value = `'${value.toISOString()}'`
    } else if (Array.isArray(value)) {
      value = value.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ')
    }
    
    result += value + strings[i + 1]
  }
  return result
}

/**
 * Marks a string as raw SQL so it won't be escaped.
 */
sql.raw = (val) => ({ __raw: true, val })

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
export const NONE_MACHINE = '__NONE__'

// ── Date sanitizer ────────────────────────────────────────────────────────────
/**
 * Converts any date-like value to a safe 'YYYY-MM-DD' string.
 * Throws if the result is not a valid date, preventing any possibility
 * of SQL injection via date parameters.
 *
 * @param {string|Date} value
 * @returns {string} e.g. '2026-06-29'
 */
export function safeDate(value) {
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
export function normalizeStatus(status) {
  if (!status) return status
  // The workflow uses Jaguar Validate; fold plain "Validate" into it
  if (status === 'Validate') return 'Jaguar Validate'
  if (status.startsWith('Validate ')) return status.replace('Validate ', 'Jaguar Validate ')
  return status
}

export function isMonitoredStatus(status) {
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
export async function query(script, location = 'mustang', attempt = 1) {
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



// ── New-process-only filter ───────────────────────────────────────────────────
/**
 * Returns an optional SQL AND clause that restricts to non-rework books.
 * When newProcessOnly is true, appends "AND IsRework = 0".
 * @param {boolean} [newProcessOnly=false]
 */
export function reworkFilter(newProcessOnly = false) {
  return newProcessOnly ? " AND IsRework = 'False'" : ''
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