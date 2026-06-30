/**
 * services/ilms-api.js
 *
 * Wrapper around the iLMS (Integrated Library Management System) REST API.
 * iLMS is the client's internal book catalog. We query it to look up book
 * metadata (title, publisher, etc.) by ISBN or to determine which project
 * (Mustang / Jaguar) an ISBN belongs to.
 *
 * Required environment variable:
 *   ILMS_AUTH_TOKEN  — Bearer JWT issued by the iLMS server.
 *                      Get it from the iLMS admin or generate via the iLMS login endpoint.
 *
 * Optional environment variable:
 *   ILMS_BASE_URL    — Fallback base URL for the legacy/staging iLMS instance.
 */

import axios from 'axios'

// ── Auth token — MUST be set in .env as ILMS_AUTH_TOKEN ───────────────────────
// We never fall back to a hardcoded value; missing token = warn and requests fail.
const ILMS_AUTH_TOKEN = process.env.ILMS_AUTH_TOKEN

if (!ILMS_AUTH_TOKEN) {
  console.warn('⚠️  ILMS_AUTH_TOKEN is not set in .env — all iLMS API calls will fail.')
}

// ── Per-project endpoint URLs ─────────────────────────────────────────────────
// Each project runs its own iLMS instance with its own search endpoint.
const PROJECT_ENDPOINTS = {
  mustang: 'https://mstx.innodata.com/milms/book-server/api/searchBookByIsbnOrTitleOreISBNorAuthor',
  jaguar:  'https://jgur.innodata.com/JiLMS/book-server/api/searchBookByIsbnOrTitleOreISBNorAuthor',
}

// Legacy / staging fallback base URL (used by the ILMSApiService class below)
const ILMS_BASE_URL = process.env.ILMS_BASE_URL || 'https://iLMSStaging.innodata.com/book-server/api'

// ── Shared request headers ────────────────────────────────────────────────────
// Authorization header uses the token from .env only.
const HEADERS = {
  'Authorization': ILMS_AUTH_TOKEN ? `Bearer ${ILMS_AUTH_TOKEN}` : '',
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
 * @param {string} isbn  - ISBN to search for
 * @returns {{ success: boolean, data: any }}
 */
async function queryILMS(url, isbn) {
  try {
    const response = await axios.get(url, {
      params: { text: isbn },
      headers: HEADERS,
      timeout: 10000, // 10 second timeout per request
    })
    const data = response.data
    // iLMS returns an array; empty array or { Message } field = not found
    const hasResult = Array.isArray(data)
      ? data.length > 0 && !data[0]?.Message
      : data && !data.Message
    return { success: hasResult, data }
  } catch {
    // Network error, timeout, or non-2xx response
    return { success: false, data: null }
  }
}

// ── ILMSApiService class ──────────────────────────────────────────────────────
/**
 * Service class for all iLMS API interactions.
 * Uses the legacy/staging base URL for general searches.
 * Use identifyProject() for dual-project (Mustang/Jaguar) lookups.
 */
class ILMSApiService {
  constructor() {
    // Pre-configured axios instance with base URL, auth headers, and 30s timeout
    this.client = axios.create({
      baseURL: ILMS_BASE_URL,
      headers: HEADERS,
      timeout: 30000
    })
  }

  /**
   * Search for a book by ISBN in the legacy/staging iLMS.
   * @param {string} isbn
   * @returns {{ success: boolean, data: any, error?: string }}
   */
  async searchBookByISBN(isbn) {
    try {
      const response = await this.client.get('/searchBookByIsbnOrTitleOreISBNorAuthor', {
        params: { text: isbn }
      })
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Error searching book by ISBN:', error.message)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Search a specific project's iLMS instance by ISBN.
   * @param {string} isbn
   * @param {'mustang'|'jaguar'} project
   * @returns {{ success: boolean, data: any }}
   */
  async searchByProject(isbn, project) {
    const url = PROJECT_ENDPOINTS[project]
    if (!url) return { success: false, data: null }
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
      // Found in both — rare but possible; return both results
      return { project: 'both', data: mustangRes.data, mustang: mustangRes.data, jaguar: jaguarRes.data }
    }
    // Not found in either project
    return { project: 'unknown', data: null, mustang: null, jaguar: null }
  }

  /**
   * Search for books by title/publisher/author in the legacy iLMS.
   * @param {string} text - Free-text search string
   */
  async searchBookByTitle(text) {
    try {
      const response = await this.client.get('/searchBookByTitleOrPublisherOrAuthor', {
        params: { text }
      })
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Error searching book by title:', error.message)
      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Push received-book info back to iLMS (used after physical receipt confirmation).
   * @param {object} bookData - Book payload expected by the iLMS POST endpoint
   */
  async updateReceiveInfo(bookData) {
    try {
      const response = await this.client.post('/', bookData)
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Error updating receive info:', error.message)
      return { success: false, error: error.message, data: null }
    }
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
      const promises = batch.map(isbn => this.searchBookByISBN(isbn))
      const batchResults = await Promise.all(promises)
      results.push(...batchResults)
      
      // Pause between batches (except after the last one)
      if (i + batchSize < isbns.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return results
  }
}

// Export a single shared instance used across all routes
export const ilmsApi = new ILMSApiService()
