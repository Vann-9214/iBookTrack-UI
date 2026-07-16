import { logger } from '../utils/logger.js'
/**
 * services/ilms-api.js
 *
 * Wrapper around the iLMS (Integrated Library Management System) REST API.
 * iLMS is the client's internal book catalog. We query it to look up book
 * metadata (title, publisher, etc.) by ISBN or to determine which project
 * (Mustang / Jaguar) an ISBN belongs to.
 *
 * Required environment variables:
 *   ILMS_AUTH_TOKEN        — Bearer JWT issued by the iLMS server.
 *   ILMS_BASE_MUSTANG_URL  — Base URL for the Mustang iLMS instance.
 *   ILMS_BASE_JAGUAR_URL   — Base URL for the Jaguar iLMS instance.
 *   ILMS_MUSTANG_URL       — Full search endpoint for Mustang.
 *   ILMS_JAGUAR_URL        — Full search endpoint for Jaguar.
 */

import axios from 'axios'

const ILMS_AUTH_TOKEN = process.env.ILMS_AUTH_TOKEN

if (!ILMS_AUTH_TOKEN) {
  console.warn('⚠️  ILMS_AUTH_TOKEN is not set in .env — all iLMS API calls will fail.')
}

export function getTokenPayload(token) {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
  } catch {
    return null
  }
}

export const ILMS_TOKEN_PAYLOAD = getTokenPayload(ILMS_AUTH_TOKEN)
export const ILMS_TOKEN_IS_EXPIRED = ILMS_TOKEN_PAYLOAD?.exp
  ? Date.now() >= ILMS_TOKEN_PAYLOAD.exp * 1000
  : false

// ── Per-project endpoint URLs ─────────────────────────────────────────────────
const PROJECT_ENDPOINTS = {
  mustang: process.env.ILMS_MUSTANG_URL,
  jaguar:  process.env.ILMS_JAGUAR_URL,
}

const BASE_URLS = {
  mustang: process.env.ILMS_BASE_MUSTANG_URL,
  jaguar:  process.env.ILMS_BASE_JAGUAR_URL,
}

// ── Shared request headers ────────────────────────────────────────────────────
const HEADERS = {
  'Authorization': ILMS_AUTH_TOKEN,
  'Content-Type': 'application/json',
}

// ── Internal helper: query a single iLMS endpoint ────────────────────────────
/**
 * Sends a GET request to a specific iLMS search URL.
 * iLMS returns either:
 *   - An array of book objects (success)
 *   - An array with a single { Message: "..." } object (not found)
 *   - An empty array (not found)
 *
 * @param {string} url   - Full endpoint URL
 * @param {string} text  - Search text (ISBN, title, etc.) — empty string = all rows
 * @returns {{ success: boolean, data: any[] }}
 */
async function queryILMS(url, text = '') {
  try {
    const response = await axios.get(url, {
      params: { text },
      headers: HEADERS,
      timeout: 30000,
    })
    const data = response.data
    const rows = Array.isArray(data) ? data : (data ? [data] : [])
    // Filter out iLMS "not found" message objects
    const valid = rows.filter(r => r && !r.Message)
    return { success: valid.length > 0, data: valid }
  } catch (err) {
    logger.error(`iLMS Query Failed [${url}]:`, err.message || err);
    return { success: false, data: [] }
  }
}

// ── ILMSApiService class ──────────────────────────────────────────────────────
class ILMSApiService {

  /**
   * Search for a book by ISBN.
   * Queries Mustang and Jaguar simultaneously; prefers Mustang if both find the book.
   * @param {string} isbn
   * @returns {{ success: boolean, data: any, source?: string, error?: string }}
   */
  async searchBookByISBN(isbn) {
    const [mustangResult, jaguarResult] = await Promise.all([
      queryILMS(PROJECT_ENDPOINTS.mustang, isbn),
      queryILMS(PROJECT_ENDPOINTS.jaguar, isbn),
    ])

    if (mustangResult.success) {
      const data = mustangResult.data
      return {
        success: true,
        data: Array.isArray(data) ? data[0] : data,
        source: 'Mustang'
      }
    }

    if (jaguarResult.success) {
      const data = jaguarResult.data
      return {
        success: true,
        data: Array.isArray(data) ? data[0] : data,
        source: 'Jaguar'
      }
    }

    return {
      success: false,
      error: `ISBN ${isbn} not found in iLMS records.`,
      data: null
    }
  }

  /**
   * Fetch ALL rows from both Mustang and Jaguar iLMS instances,
   * merge them, filter out rows where Received-Status is 'received',
   * then group into unique lots → each with their unique box numbers.
   *
   * iLMS requires a search term — we query with '978' and '979' (all ISBN prefixes)
   * in parallel to capture the full catalog.
   *
   * Returns:
   *   {
   *     lots: [
   *       { lot_number: "65", boxes: ["1/100", "2/100", ...] },
   *       ...
   *     ]
   *   }
   */
  async fetchAllLots() {
    // Helper function to query the new paginated endpoint
    const fetchPaginated = async (baseUrl, searchText) => {
      if (!baseUrl) return [];
      const url = `${baseUrl.replace(/\/$/, '')}/searchBooksByNameAndIsbn`;
      try {
        const response = await axios.get(url, {
          params: { searchText, page: 1, itemsPerPage: 1000, isALl: false },
          headers: HEADERS,
          timeout: 30000,
        });
        return response.data && Array.isArray(response.data.result) ? response.data.result : [];
      } catch (err) {
        logger.error(`Failed to fetch from ${baseUrl} for "${searchText}":`, err.message);
        return [];
      }
    };

    // Query both Mustang and Jaguar with broad prefixes to capture recent/active books
    const prefixes = ['978', '979', 'Lot', 'P7', 'P6'];
    const queries = [];
    
    for (const prefix of prefixes) {
      queries.push(fetchPaginated(BASE_URLS.mustang, prefix));
      queries.push(fetchPaginated(BASE_URLS.jaguar, prefix));
    }

    const results = await Promise.all(queries);

    // Merge all rows, deduplicate by a unique key (ISBN + LotNo + BoxNo)
    const seen = new Set()
    const allRows = results.flat().filter(row => {
      if (!row) return false;
      const key = `${row.ISBN}|${row.LotNo}|${row.BoxNo}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    if (allRows.length === 0) {
      return { lots: [] }
    }

    // Field name in iLMS is 'Received-Status' (with hyphen)
    const active = allRows.filter(row => {
      const status = (row['Received-Status'] || '').toLowerCase()
      return status !== 'received'
    })

    // Group by LotNo — each lot holds unique BoxNo values
    const lotMap = new Map()
    for (const row of active) {
      const lot = row.LotNo
      const box = row.BoxNo
      if (!lot) continue
      if (!lotMap.has(lot)) lotMap.set(lot, new Set())
      if (box) lotMap.get(lot).add(box)
    }

    // Sort lots numerically where possible, alphabetically otherwise
    const lots = [...lotMap.entries()]
      .sort(([a], [b]) => {
        // Strip non-numeric prefix (e.g. 'Lot-25' → 25)
        const na = Number(a.replace(/[^0-9]/g, '')), nb = Number(b.replace(/[^0-9]/g, ''))
        if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb
        return a.localeCompare(b)
      })
      .map(([lot_number, boxSet]) => ({
        lot_number,
        boxes: [...boxSet].sort((a, b) => {
          const na = Number(a.split('/')[0]), nb = Number(b.split('/')[0])
          if (!isNaN(na) && !isNaN(nb)) return na - nb
          return a.localeCompare(b)
        })
      }))

    return { lots }
  }

  /**
   * Search a specific project's iLMS instance by ISBN.
   * @param {string} isbn
   * @param {'mustang'|'jaguar'} project
   * @returns {{ success: boolean, data: any }}
   */
  async searchByProject(isbn, project) {
    const url = PROJECT_ENDPOINTS[project]
    if (!url) return { success: false, data: [] }
    return queryILMS(url, isbn)
  }

  /**
   * Query both project iLMS endpoints in parallel to determine which project
   * an ISBN belongs to. Returns { project, data, mustang, jaguar }.
   *
   * project will be: 'mustang' | 'jaguar' | 'both' | 'unknown'
   *
   * @param {string} isbn
   */
  async identifyProject(isbn) {
    const [mustangRes, jaguarRes] = await Promise.all([
      queryILMS(PROJECT_ENDPOINTS.mustang, isbn),
      queryILMS(PROJECT_ENDPOINTS.jaguar,  isbn),
    ])

    if (mustangRes.success && !jaguarRes.success) {
      return { project: 'mustang', data: mustangRes.data, mustang: mustangRes.data, jaguar: null }
    }
    if (jaguarRes.success && !mustangRes.success) {
      return { project: 'jaguar',  data: jaguarRes.data,  mustang: null, jaguar: jaguarRes.data }
    }
    if (mustangRes.success && jaguarRes.success) {
      return { project: 'both', data: mustangRes.data, mustang: mustangRes.data, jaguar: jaguarRes.data }
    }
    return { project: 'unknown', data: null, mustang: null, jaguar: null }
  }

  /**
   * Search for multiple ISBNs in batches of 10, with a 1-second pause between
   * batches to avoid hammering the iLMS server.
   * @param {string[]} isbns
   * @returns {Array<{ success: boolean, data: any }>}
   */
  async searchMultipleISBNs(isbns) {
    const results = []
    const batchSize = 10

    for (let i = 0; i < isbns.length; i += batchSize) {
      const batch = isbns.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(isbn => this.searchBookByISBN(isbn)))
      results.push(...batchResults)

      if (i + batchSize < isbns.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
  }
}

// Export a single shared instance used across all routes
export const ilmsApi = new ILMSApiService()
