import { db } from '../../config/db.js';
import { logger } from '../../utils/logger.js';


export const isbnStreamService = async (req, res) => {
  // SSE headers — keep connection alive
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering if present
  res.flushHeaders()

  // Send a heartbeat comment every 25 s to prevent proxy timeouts
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 25000)

  // Helper to push a named event to the client
  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  // Send initial connected event
  send('connected', { message: 'ISBN stream ready' })

  // If the client passes ?isbn= on the initial request, handle it immediately
  const initialIsbn = req.query.isbn
  if (initialIsbn) {
    try {
      const { ilmsApi } = await import('../ilms/api.js')
      const ilmsResult = await ilmsApi.searchBookByISBN(initialIsbn)
      send('isbn-result', { isbn: initialIsbn, success: ilmsResult.success, data: ilmsResult.data || null, source: ilmsResult.source || null, error: ilmsResult.error || null })
    } catch (err) {
      send('isbn-result', { isbn: initialIsbn, success: false, data: null, error: err.message })
    }
  }

  // Attach a request handler so the client can trigger lookups by sending
  // a new GET to this same SSE connection via a POST to /isbn-stream/query
  req.on('close', () => {
    clearInterval(heartbeat)
  })
}

export const queryIsbnStreamService = async (req, res) => {
  const { isbn, type, allowExisting, issueType } = req.body

  const cleaned = isbn.replace(/[^0-9a-zA-Z]/g, '').toUpperCase()
  if (cleaned.length !== 10 && cleaned.length !== 13) {
    return res.status(400).json({ success: false, error: 'Invalid ISBN. Must be 10 or 13 characters.' })
  }

  try {
    // Only block global duplicates for normal scans. Missing/extra issue entries
    // are allowed to reference books already scanned in other lots/boxes.
    if (!allowExisting) {
      let query = `
        SELECT b.id, bx.box_number, bx.box_type, l.lot_number
        FROM books b
        LEFT JOIN boxes bx ON b.box_id = bx.id
        LEFT JOIN lots l ON bx.lot_id = l.id
        WHERE b.isbn = $1 AND b.is_missing = false
      `;
      const params = [cleaned];
      if (type) {
        query += ` AND (LOWER(b.book_type) = LOWER($2) OR LOWER(bx.box_type) = LOWER($2) OR LOWER(l.type) = LOWER($2))`;
        params.push(type);
      }
      
      const { rows: existingBooks } = await db.query(query + ' LIMIT 1', params);
      const existingBook = existingBooks[0] || null;

      if (existingBook) {
        const rawLot = existingBook.lot_number || 'unknown'
        const lotLabel = rawLot.toLowerCase().startsWith('lot')
          ? rawLot.charAt(0).toUpperCase() + rawLot.slice(1)
          : `Lot ${rawLot}`
        const boxNumber = existingBook.box_number || 'unknown'
        const boxType = existingBook.box_type || 'unknown'

        return res.json({
          success: false,
          error: `Duplicate ISBN: ${cleaned} is already scanned in ${lotLabel}, Box ${boxNumber} (${boxType}).`
        });
      }
    }

    if (allowExisting && issueType === 'missing') {
      let query = `
        SELECT b.id, bx.box_number, bx.box_type, l.lot_number, l.type as lot_type
        FROM books b
        LEFT JOIN boxes bx ON b.box_id = bx.id
        LEFT JOIN lots l ON bx.lot_id = l.id
        WHERE b.isbn = $1 AND b.is_missing = true
      `;
      const params = [cleaned];
      if (type) {
        query += ` AND (LOWER(b.book_type) = LOWER($2) OR LOWER(bx.box_type) = LOWER($2) OR LOWER(l.type) = LOWER($2))`;
        params.push(type);
      }
      
      const { rows: existingMissings } = await db.query(query + ' LIMIT 1', params);
      const existingMissing = existingMissings[0] || null;

      if (existingMissing) {
        const rawLot = existingMissing.lot_number || 'unknown'
        const lotLabel = rawLot.toLowerCase().startsWith('lot')
          ? rawLot.charAt(0).toUpperCase() + rawLot.slice(1)
          : `Lot ${rawLot}`
        const boxNumber = existingMissing.box_number || 'unknown'
        return res.json({
          success: false,
          error: `Duplicate Missing Book: ISBN ${cleaned} is already marked as missing in ${lotLabel}, Box ${boxNumber}.`
        });
      }
    }

    const { ilmsApi } = await import('../ilms/api.js')
    let ilmsResult;
    const projectLabel = type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'iLMS'
    
    if (type) {
      const projResult = await ilmsApi.searchByProject(cleaned, type)
      const results = Array.isArray(projResult.data) ? projResult.data : (projResult.data ? [projResult.data] : [])
      const firstHit = results.find(b => b.ISBN && b.ISBN.replace(/[^0-9a-zA-Z]/g, '').toUpperCase() === cleaned) || null
      const error = firstHit
        ? null
        : `ISBN ${cleaned} was not found in ${projectLabel} records. No exact match was returned by the ${projectLabel} iLMS endpoint.`

      ilmsResult = {
        success: !!firstHit,
        data: firstHit,
        source: projectLabel,
        error
      }
    } else {
      const rawResult = await ilmsApi.searchBookByISBN(cleaned)
      let firstHit = rawResult.data
      if (firstHit && firstHit.ISBN && firstHit.ISBN.replace(/[^0-9a-zA-Z]/g, '').toUpperCase() !== cleaned) {
        // iLMS did a fuzzy search; reject the title match
        firstHit = null
      }
      ilmsResult = {
        success: !!firstHit,
        data: firstHit,
        error: firstHit ? null : (rawResult.error || `ISBN ${cleaned} was not found in Mustang or Jaguar iLMS records.`)
      }
    }

    res.json({
      isbn: cleaned,
      success: ilmsResult.success,
      data: ilmsResult.data || null,
      source: ilmsResult.source || null,
      error: ilmsResult.error || null
    })
  } catch (err) {
    res.status(500).json({ isbn: cleaned, success: false, data: null, error: err.message })
  }
}

export const searchIsbnService = async (req, res) => {
  try {
    const { isbn } = req.params

    // First, try to get book details from iLMS API
    const { ilmsApi } = await import('../ilms/api.js')
    const ilmsResult = await ilmsApi.searchBookByISBN(isbn)

    let bookTitle = null
    let bookAuthor = null
    let ilmsBoxNo = null
    let ilmsLotNo = null
    let ilmsData = null

    if (ilmsResult.success && ilmsResult.data) {
      ilmsData = ilmsResult.data
      bookTitle = ilmsData.Title
      bookAuthor = ilmsData.Author
      ilmsBoxNo = ilmsData.BoxNo
      ilmsLotNo = ilmsData.LotNo
    }

    // Search in warehouse scan logs
    const { rows: rawScans } = await db.query(`
      SELECT ba.*, uf.rejection_reason, b.isbn, b.title, b.author, b.book_type, bx.box_number, bx.current_stage, l.lot_number
      FROM book_activity ba
      LEFT JOIN user_flags uf ON uf.book_activity_id = ba.id
      JOIN books b ON ba.book_id = b.id
      LEFT JOIN boxes bx ON b.box_id = bx.id
      LEFT JOIN lots l ON bx.lot_id = l.id
      WHERE b.isbn = $1
      ORDER BY ba.warehouse_scan_at DESC
    `, [isbn]);
    
    const groupedScans = new Map();
    for (const scan of rawScans) {
      if (!groupedScans.has(scan.id)) {
        groupedScans.set(scan.id, { ...scan });
      }
    }
    const scans = Array.from(groupedScans.values());

    // Search current book location in books table
    const { rows: bookRows } = await db.query(`
      SELECT b.*, bx.box_number, l.lot_number
      FROM books b
      LEFT JOIN boxes bx ON b.box_id = bx.id
      LEFT JOIN lots l ON bx.lot_id = l.id
      WHERE b.isbn = $1 LIMIT 1
    `, [isbn]);
    const book = bookRows[0] || null;

    // Determine box location
    let boxNumber = null
    let lotNumber = null
    let inWarehouse = false
    
    if (scans && scans.length > 0) {
      const latestScan = scans[0]
      boxNumber = latestScan.box_number || null
      lotNumber = latestScan.lot_number || null
      inWarehouse = true
    } else if (book) {
      boxNumber = book.box_number || null
      lotNumber = book.lot_number || null
      inWarehouse = true
    }

    const bookFound = ilmsData || book || (scans && scans.length > 0)

    if (!bookFound) {
      return res.json({
        success: false,
        message: 'ISBN not found in iLMS or database',
        book: null
      })
    }

    res.json({ 
      success: true,
      book: {
        isbn,
        title: bookTitle || book?.title || 'Unknown',
        author: bookAuthor || book?.author || null,
        box_number: boxNumber || ilmsBoxNo || 'Not in warehouse yet',
        lot_number: lotNumber || ilmsLotNo || 'Unknown',
        current_stage: scans?.[0]?.current_stage || (inWarehouse ? 'Unknown' : 'Not scanned yet'),
        scan_status: scans?.[0]?.scan_status || null,
        rejection_reason: scans?.[0]?.rejection_reason || null,
        book_type: scans?.[0]?.book_type || book?.book_type || null,
        scanned: scans && scans.length > 0,
        scan_count: scans?.length || 0,
        in_warehouse: inWarehouse,
        in_ilms: !!ilmsData
      },
      scans: scans.map(s => ({
        ...s,
        user_flags: { rejection_reason: s.rejection_reason },
        books: { isbn: s.isbn, title: s.title, author: s.author, book_type: s.book_type, box: { box_number: s.box_number, current_stage: s.current_stage, lot: { lot_number: s.lot_number } } }
      })),
      currentLocation: book ? {
        ...book, box: { box_number: book.box_number, lot: { lot_number: book.lot_number } }
      } : null,
      ilmsData: ilmsData || null
    })
  } catch (error) {
    logger.error('Search ISBN error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}
