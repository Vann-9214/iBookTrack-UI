import { supabaseAdmin } from '../../config/supabase.js';
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
  const { isbn, type, allowExisting } = req.body

  const digits = isbn.replace(/[^0-9]/g, '')
  if (digits.length !== 10 && digits.length !== 13) {
    return res.status(400).json({ success: false, error: 'Invalid ISBN. Must be 10 or 13 digits.' })
  }

  try {
    // Only block global duplicates for normal scans. Missing/extra issue entries
    // are allowed to reference books already scanned in other lots/boxes.
    if (!allowExisting) {
      let query = supabaseAdmin
        .from('books')
        .select(`
          id,
          box:boxes(box_number, box_type, lot:lots(lot_number))
        `)
        .eq('isbn', digits)
      if (type) query = query.eq('book_type', type.charAt(0).toUpperCase() + type.slice(1).toLowerCase());
      else query = query.is('book_type', null);

      const { data: existingBook } = await query.limit(1).maybeSingle();
      if (existingBook) {
        const rawLot = existingBook.box?.lot?.lot_number || 'unknown'
        const lotLabel = rawLot.toLowerCase().startsWith('lot')
          ? rawLot.charAt(0).toUpperCase() + rawLot.slice(1)
          : `Lot ${rawLot}`
        const boxNumber = existingBook.box?.box_number || 'unknown'
        const boxType = existingBook.box?.box_type || 'unknown'
        return res.json({
          success: false,
          error: `Duplicate ISBN: ${digits} is already scanned in ${lotLabel}, Box ${boxNumber} (${boxType}).`
        });
      }
    }

    const { ilmsApi } = await import('../ilms/api.js')
    let ilmsResult;
    const projectLabel = type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'iLMS'
    
    if (type) {
      const projResult = await ilmsApi.searchByProject(digits, type)
      const results = Array.isArray(projResult.data) ? projResult.data : (projResult.data ? [projResult.data] : [])
      const firstHit = results.find(b => b.ISBN && b.ISBN.replace(/[^0-9]/g, '') === digits) || null
      let error = null

      if (!firstHit) {
        if (results.length > 0) {
          error = `ISBN ${digits} was not found in ${projectLabel} records. The ${projectLabel} iLMS search returned results, but none matched that exact ISBN.`
        } else {
          const otherProject = type.toLowerCase() === 'mustang' ? 'Jaguar' : 'Mustang'
          const otherLookup = await ilmsApi.searchByProject(digits, otherProject.toLowerCase())
          if (otherLookup.success) {
            error = `ISBN ${digits} was not found in ${projectLabel} records. It does appear in ${otherProject} records, so this session may be using the wrong project.`
          } else {
            error = `ISBN ${digits} was not found in ${projectLabel} records. No exact match was returned by the ${projectLabel} iLMS endpoint.`
          }
        }
      }

      ilmsResult = {
        success: !!firstHit,
        data: firstHit,
        source: projectLabel,
        error
      }
    } else {
      const rawResult = await ilmsApi.searchBookByISBN(digits)
      let firstHit = rawResult.data
      if (firstHit && firstHit.ISBN && firstHit.ISBN.replace(/[^0-9]/g, '') !== digits) {
        // iLMS did a fuzzy search; reject the title match
        firstHit = null
      }
      ilmsResult = {
        success: !!firstHit,
        data: firstHit,
        error: firstHit ? null : (rawResult.error || `ISBN ${digits} was not found in Mustang or Jaguar iLMS records.`)
      }
    }

    res.json({
      isbn: digits,
      success: ilmsResult.success,
      data: ilmsResult.data || null,
      source: ilmsResult.source || null,
      error: ilmsResult.error || null
    })
  } catch (err) {
    res.status(500).json({ isbn: digits, success: false, data: null, error: err.message })
  }
}

export const searchIsbnService = async (req, res) => {
  try {
    const { isbn } = req.params

    // First, try to get book details from iLMS API
    const { ilmsApi } = await import('../ilms/api.js')
    const ilmsResult = await ilmsApi.searchBookByISBN(isbn)

    let bookTitle = null
    let ilmsBoxNo = null
    let ilmsLotNo = null
    let ilmsData = null

    if (ilmsResult.success && ilmsResult.data) {
      ilmsData = ilmsResult.data
      bookTitle = ilmsData.Title
      ilmsBoxNo = ilmsData.BoxNo
      ilmsLotNo = ilmsData.LotNo
    }

    // Search in warehouse scan logs (include user_flags for rejection_reason)
    const { data: scans, error: scanError } = await supabaseAdmin
      .from('book_activity')
      .select(`
        *,
        user_flags(rejection_reason),
        books!inner(
          isbn,
          title,
          book_type,
          box:boxes(
            box_number,
            current_stage,
            lot:lots(lot_number)
          )
        )
      `)
      .eq('books.isbn', isbn)
      .order('warehouse_scan_at', { ascending: false })

    if (scanError) throw scanError

    // Also search current book location in books table
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select(`
        *,
        box:boxes(box_number, lot:lots(lot_number))
      `)
      .eq('isbn', isbn)
      .single()

    if (bookError && bookError.code !== 'PGRST116') throw bookError

    // Determine box location
    let boxNumber = null
    let lotNumber = null
    let inWarehouse = false
    
    if (scans && scans.length > 0) {
      // Use most recent scan
      const latestScan = scans[0]
      boxNumber = latestScan.books?.box?.box_number || null
      lotNumber = latestScan.books?.box?.lot?.lot_number || null
      inWarehouse = true
    } else if (book) {
      boxNumber = book.box?.box_number || null
      lotNumber = book.box?.lot?.lot_number || null
      inWarehouse = true
    }

    // If book found in iLMS or database, return success
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
        box_number: boxNumber || ilmsBoxNo || 'Not in warehouse yet',
        lot_number: lotNumber || ilmsLotNo || 'Unknown',
        current_stage: scans?.[0]?.books?.box?.current_stage || (inWarehouse ? 'Unknown' : 'Not scanned yet'),
        scan_status: scans?.[0]?.scan_status || null,
        rejection_reason: (Array.isArray(scans?.[0]?.user_flags) ? scans[0].user_flags[0] : scans?.[0]?.user_flags)?.rejection_reason || null,
        book_type: scans?.[0]?.books?.book_type || book?.book_type || null,
        scanned: scans && scans.length > 0,
        scan_count: scans?.length || 0,
        in_warehouse: inWarehouse,
        in_ilms: !!ilmsData
      },
      scans,
      currentLocation: book || null,
      ilmsData: ilmsData || null
    })
  } catch (error) {
    logger.error('Search ISBN error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

