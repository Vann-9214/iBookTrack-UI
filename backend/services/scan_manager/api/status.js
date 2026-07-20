import { query, sql, normalizeStatus, isMonitoredStatus } from './client.js'
import { logger } from '../../../utils/logger.js'

export async function getSimflexStatusForISBNs(isbns, location = 'mustang') {
  try {
    if (!isbns || isbns.length === 0) return { success: true, data: [] }

    // Fetch all status rows for these ISBNs across all time (not just today)
    const rows = await query(
      sql`SELECT ISBN, Status, ScanDate, Updated, PageCount, ScanUser, BoxNumber
       FROM zeusz_IsbnStatus
       WHERE ISBN IN (${isbns})
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
    logger.error('Error fetching Simflex status for ISBNs:', error)
    return { success: false, error: error.message, data: [] }
  }
}