import { query, sql, safeDate, normalizeStatus, isMonitoredStatus, reworkFilter } from './client.js'
import { logger } from '../../../utils/logger.js'

export async function getScanStageBoxes(startDate, endDate, location = 'mustang') {
  try {
    const scanStatuses = `('Scanning ONGOING', 'Scanning COMPLETED', 'Validate ONGOING', 'Validate COMPLETED', 'Jaguar Validate ONGOING', 'Jaguar Validate COMPLETED', 'Tif2PDF ONGOING', 'Tif2PDF COMPLETED', 'Preval ONGOING', 'Preval COMPLETED')`
    
    const today = new Date().toISOString().split('T')[0]
    const dateFilter = startDate && endDate
      ? sql`CAST(ScanDate AS DATE) BETWEEN ${safeDate(startDate)} AND ${safeDate(endDate)}`
      : `CAST(ScanDate AS DATE) = '${today}'`

    const newProcessFilter = `AND IsRework = 'False'`

    const countRows = await query(sql`SELECT COUNT(DISTINCT LTRIM(RTRIM(ISBN))) AS cnt
       FROM zeusz_IsbnStatus
       WHERE ${sql.raw(dateFilter)}
         AND LTRIM(RTRIM(Status)) IN ${sql.raw(scanStatuses)}
         ${sql.raw(newProcessFilter)}`,
      location
    )
    const count = (Array.isArray(countRows) ? countRows : [])[0]?.cnt || 0

    const rows = await query(sql`SELECT ISBN, BoxNumber, ScanUser, ScanMachineName AS MachineName,
              PageCount, ScanDate, Status, Updated AS LastUpdated
       FROM zeusz_IsbnStatus
       WHERE ${sql.raw(dateFilter)}
         AND LTRIM(RTRIM(Status)) IN ${sql.raw(scanStatuses)}
         ${sql.raw(newProcessFilter)}
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

    return { success: true, count, data }
  } catch (error) {
    logger.error('Error fetching scan stage boxes:', error)
    return { success: false, error: error.message, count: 0, data: [] }
  }
}

export async function getCompletedTransmissionsCount(startDate, endDate, location = 'mustang', newProcessOnly = false) {
  try {
    const dateFilter = startDate && endDate
      ? sql`CAST(DateAdded AS DATE) BETWEEN ${safeDate(startDate)} AND ${safeDate(endDate)}`
      : sql`CAST(DateAdded AS DATE) = CAST(GETDATE() AS DATE)`

    const rows = await query(sql`SELECT TOP 50000 ISBN, Status, Updated FROM zeusz_IsbnStatus WHERE ${sql.raw(dateFilter)}${sql.raw(reworkFilter(newProcessOnly))} ORDER BY Updated DESC`,
      location
    )
    const data = Array.isArray(rows) ? rows : []

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
      r => (r.Status || '').trim() === 'Transmission_Archive COMPLETED'
    ).length

    return { success: true, count: completed }
  } catch (error) {
    logger.error('Error fetching completed transmissions count:', error)
    return { success: false, count: 0, error: error.message }
  }
}

export async function getAllBooksToday(startDate, endDate, location = 'mustang', newProcessOnly = false) {
  try {
    const dateFilter = startDate && endDate
      ? sql`CAST(ScanDate AS DATE) BETWEEN ${safeDate(startDate)} AND ${safeDate(endDate)}`
      : sql`CAST(ScanDate AS DATE) = CAST(GETDATE() AS DATE)`

    const rows = await query(sql`SELECT TOP 50000 ISBN, Status, Updated, ScanUser, ScanMachineName, BoxNumber, PageCount, ScanDate FROM zeusz_IsbnStatus WHERE ${sql.raw(dateFilter)}${sql.raw(reworkFilter(newProcessOnly))} ORDER BY Updated DESC`,
      location
    )
    const data = (Array.isArray(rows) ? rows : [])
      .map(r => ({ ...r, Status: normalizeStatus(r.Status) }))
      .filter(r => isMonitoredStatus(r.Status))

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

    books.sort((a, b) => {
      if (a.isWip && !b.isWip) return -1
      if (!a.isWip && b.isWip) return 1
      return new Date(b.Updated) - new Date(a.Updated)
    })

    const totalBooks = books.length
    const wipCount   = books.filter(b => b.isWip).length

    return { success: true, books, totalBooks, wipCount, limitReached: Array.isArray(rows) && rows.length >= 50000 }
  } catch (error) {
    logger.error('Error fetching all books today:', error)
    return { success: false, books: [], totalBooks: 0, wipCount: 0, error: error.message }
  }
}

export async function getTransmitStageRows(location = 'mustang') {
  try {
    const today = new Date().toISOString().split('T')[0]
    const rows = await query(sql`SELECT ScanDate, ScanUser, BoxNumber, ISBN, PageCount, Status, Updated
       FROM zeusz_IsbnStatus
       WHERE CAST(ScanDate AS DATE) = '${sql.raw(today)}'
         AND LTRIM(RTRIM(Status)) = 'Transmission_Archive ONGOING'
         AND IsRework = 'False'
       ORDER BY Updated DESC`,
      location
    )
    const data = Array.isArray(rows) ? rows : []
    return { success: true, count: data.length, data }
  } catch (error) {
    logger.error('Error fetching transmit stage rows:', error)
    return { success: false, error: error.message, count: 0, data: [] }
  }
}