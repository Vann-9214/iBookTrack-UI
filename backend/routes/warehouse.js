/**
 * routes/warehouse.js
 *
 * Handles warehouse receiving operations — scanning books as they physically
 * arrive, grouping them into boxes, and managing warehouse sessions.
 *
 * A "session" represents one operator at one receiving station scanning a
 * batch of books. Each session is linked to a Lot and produces one or more Boxes.
 *
 * Endpoints:
 *   POST  /api/warehouse/sessions/start              — Begin a new receiving session for a lot
 *   POST  /api/warehouse/sessions/:session_id/scan   — Scan a book into the active session
 *   POST  /api/warehouse/sessions/:session_id/complete — Close out a session
 *   POST  /api/warehouse/boxes/:box_id/seal          — Mark a box as full (next scan creates a new box)
 *   GET   /api/warehouse/sessions                    — List all sessions (filterable by status)
 *   GET   /api/warehouse/sessions/:session_id        — Session details with all scanned books
 *   GET   /api/warehouse/search/isbn/:isbn           — Find which box an ISBN is in
 *   GET   /api/warehouse/rejected-books              — List non-processable (flagged) books
 *   GET   /api/warehouse/scans/recent                — Most recent scan records (for inventory page)
 *   POST  /api/warehouse/backfill-titles             — Backfill missing book titles from iLMS
 *   PATCH /api/warehouse/scans/:scan_id/flag         — Re-flag an existing scan as non-processable
 *
 * All routes require authentication (requireAuth middleware).
 */

import express from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

// Start a new warehouse receiving session
router.post('/sessions/start', requireAuth, async (req, res) => {
  try {
    const { lot_number, box_id, box_number: requestedBoxNumber } = req.body

    if (!lot_number) {
      return res.status(400).json({ error: 'lot_number is required' })
    }

    // Get or create the lot (use admin client to bypass RLS)
    let { data: lot, error: lotError } = await supabaseAdmin
      .from('lots')
      .select('*')
      .eq('lot_number', lot_number)
      .single()

    // If lot doesn't exist, create it (admin bypasses RLS policy)
    if (lotError || !lot) {
      const { data: newLot, error: createError } = await supabaseAdmin
        .from('lots')
        .insert({
          lot_number: lot_number,
          total_boxes: 0,
          status: 'intake'
        })
        .select()
        .single()
      
      if (createError) throw createError
      lot = newLot
    }

    // Validate optional pre-selected box belongs to the lot
    let assignedBoxId = null
    if (box_id) {
      const { data: selectedBox } = await supabaseAdmin
        .from('boxes')
        .select('id, lot_id')
        .eq('id', box_id)
        .single()
      if (selectedBox && selectedBox.lot_id === lot.id) {
        assignedBoxId = selectedBox.id
      }
    }

    // If no existing box found but a box_number was provided, verify or create
    if (!assignedBoxId && requestedBoxNumber) {
      const boxName = requestedBoxNumber

      // Check if box already exists
      const { data: existingBox } = await supabaseAdmin
        .from('boxes')
        .select('id, total_books_expected, current_stage')
        .eq('lot_id', lot.id)
        .eq('box_number', boxName)
        .maybeSingle()

      if (existingBox) {
        if (!req.body.force) {
          if (existingBox.total_books_expected === 0) {
            return res.status(409).json({ 
              error: 'BoxExistsWithZeroBooks', 
              message: `Box ${boxName} in Lot ${lot.lot_number} already exists but has 0 books. Do you want to proceed?`,
              box: existingBox
            })
          } else {
            return res.status(409).json({ 
              error: 'BoxExistsWithBooks', 
              message: `Box ${boxName} in Lot ${lot.lot_number} already exists and contains ${existingBox.total_books_expected} books. You cannot start a new session for this box.`,
              box: existingBox
            })
          }
        }
        assignedBoxId = existingBox.id
      } else {
        // Create new box
        const { data: newBox, error: boxCreateError } = await supabaseAdmin
          .from('boxes')
          .insert({
            box_number: boxName,
            lot_id: lot.id,
            box_type: 'processable',
            current_stage: 'warehouse',
            total_books_expected: 0,
            is_sealed: false
          })
          .select()
          .single()

        if (boxCreateError) throw boxCreateError
        assignedBoxId = newBox.id

      }
    }

    // Create warehouse session — use selected box if provided, otherwise create on first scan
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('box_sessions')
      .insert({
        box_id: assignedBoxId, // null means box will be created on first scan
        lot_id: lot.id,
        received_by: req.user.id,
        received_by_name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email,
        status: 'in_progress'
      })
      .select()
      .single()

    if (sessionError) throw sessionError

    res.status(201).json({ 
      session,
      lot_id: lot.id,
      lot_number: lot.lot_number,
      message: assignedBoxId ? 'Session started with selected box.' : 'Session started. Boxes will be created as you scan books.'
    })
  } catch (error) {
    console.error('Start warehouse session error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Scan a book in the warehouse
router.post('/sessions/:session_id/scan', requireAuth, async (req, res) => {
  try {
    const { session_id } = req.params
    const { isbn, title: scannedTitle, scan_status, rejection_reason, notes } = req.body

    if (!isbn) {
      return res.status(400).json({ error: 'ISBN is required' })
    }

    if (!scan_status) {
      return res.status(400).json({ error: 'scan_status is required' })
    }

    // Get session details (use admin to bypass RLS)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('box_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionError) throw sessionError
    if (!session) return res.status(404).json({ error: 'Session not found' })

    if (session.status !== 'in_progress') {
      return res.status(400).json({ error: 'Session is not in progress' })
    }

    // Get lot_id and lot_number from session
    const lotId = session.lot_id
    
    if (!lotId) {
      return res.status(400).json({ error: 'Session does not have a lot assigned' })
    }
    
    // Get lot details
    const { data: lot } = await supabaseAdmin
      .from('lots')
      .select('lot_number')
      .eq('id', lotId)
      .single()
    
    const lotNumber = lot?.lot_number || 'UNKNOWN'

    // Helper function to get next box number for lot
    const getNextBoxNumber = async (lotId, boxType, lotNumber) => {
      const { data: existingBoxes } = await supabaseAdmin
        .from('boxes')
        .select('box_number')
        .eq('lot_id', lotId)
        .eq('box_type', boxType)
        .order('created_at', { ascending: false })
        .limit(1)

      let nextNum = 1
      if (existingBoxes && existingBoxes.length > 0) {
        const match = existingBoxes[0].box_number.match(/(\d+)$/)
        if (match) nextNum = parseInt(match[1]) + 1
      }
      return `${lotNumber}-${boxType.toUpperCase()}-${String(nextNum).padStart(4, '0')}`
    }

    // Helper function to create box on-demand
    const createBoxIfNeeded = async (boxType, lotNumber) => {
      const boxNumber = await getNextBoxNumber(lotId, boxType, lotNumber)
      const { data: newBox, error: boxInsertError } = await supabaseAdmin
        .from('boxes')
        .insert({
          box_number: boxNumber,
          lot_id: lotId,
          box_type: boxType,
          current_stage: 'warehouse',
          total_books_expected: 0,
          is_sealed: false
        })
        .select()
        .single()

      if (boxInsertError) {
        console.error('Box insert error:', boxInsertError)
        throw new Error(`Failed to create box: ${boxInsertError.message}`)
      }
      if (!newBox) throw new Error('Box insert returned null — check RLS or box_type constraint on boxes table')

      // Increment total_boxes in lots table
      const { data: currentLot } = await supabaseAdmin
        .from('lots')
        .select('total_boxes')
        .eq('id', lotId)
        .single()
      
      await supabaseAdmin
        .from('lots')
        .update({ total_boxes: (currentLot?.total_boxes || 0) + 1 })
        .eq('id', lotId)
      
      return newBox
    }

    // All books go into one box per session regardless of status
    let assignedBoxId = null
    let currentBox = null

    if (!session.box_id) {
      // Create the single session box on first scan
      currentBox = await createBoxIfNeeded('processable', lotNumber)
      assignedBoxId = currentBox.id
      await supabaseAdmin
        .from('box_sessions')
        .update({ box_id: currentBox.id })
        .eq('id', session_id)
    } else {
      // Check if current box is sealed (manually marked as full)
      const { data: boxData } = await supabaseAdmin
        .from('boxes')
        .select('*')
        .eq('id', session.box_id)
        .single()

      if (boxData && boxData.is_sealed) {
        // Box is full — create a new one and update session
        currentBox = await createBoxIfNeeded('processable', lotNumber)
        assignedBoxId = currentBox.id
        await supabaseAdmin
          .from('box_sessions')
          .update({ box_id: currentBox.id })
          .eq('id', session_id)
      } else {
        assignedBoxId = session.box_id
        currentBox = boxData
      }
    }

    // Insert book in the books table to get book_id
    let bookId = null
    if (assignedBoxId) {
      const { data: bookData, error: bookInsertError } = await supabaseAdmin
        .from('books')
        .insert({
          isbn,
          box_id: assignedBoxId,
          title: scannedTitle || null
        })
        .select('id')
        .single()
      
      if (bookInsertError) {
        console.error('Books insert error:', bookInsertError)
        throw bookInsertError
      }
      if (bookData) {
        bookId = bookData.id
      }
    }

    // Create scan log (use admin to bypass RLS)
    const { data: scanLog, error: scanError } = await supabaseAdmin
      .from('book_activity')
      .insert({
        session_id,
        book_id: bookId,
        scan_status,
        rejection_reason,
        notes,
        scanned_by: req.user.id,
        scanned_by_name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email
      })
      .select()
      .single()

    if (scanError) throw scanError

    res.status(201).json({ 
      scanLog,
      currentBox: currentBox ? {
        box_number: currentBox.box_number,
        is_sealed: currentBox.is_sealed
      } : null
    })
  } catch (error) {
    console.error('Scan book error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Complete a warehouse session
router.post('/sessions/:session_id/complete', requireAuth, async (req, res) => {
  try {
    const { session_id } = req.params
    const { total_books_expected, issues, stage } = req.body

    // Get session to find the associated box
    const { data: session, error: sessionFetchError } = await supabaseAdmin
      .from('box_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionFetchError) throw sessionFetchError

    // Update total_books_expected on the associated box
    if (session.box_id && total_books_expected && stage !== 'inventory') {
      await supabaseAdmin
        .from('boxes')
        .update({ total_books_expected: parseInt(total_books_expected) })
        .eq('id', session.box_id)
    }

    // Process issues (missing/extra books)
    if (issues && issues.length > 0) {
      const scannedBy = req.user.id
      const scannedByName = req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email

      for (const issue of issues) {
        // Find if book already exists in DB for this box
        let { data: existingBook } = await supabaseAdmin
          .from('books')
          .select('id')
          .eq('isbn', issue.isbn)
          .eq('box_id', session.box_id)
          .maybeSingle()

        let bookId = existingBook?.id

        if (!bookId) {
          // Check globally in case it exists in another box
          let { data: globalBook } = await supabaseAdmin
            .from('books')
            .select('id')
            .eq('isbn', issue.isbn)
            .limit(1)
            .maybeSingle()
            
          if (globalBook) {
            bookId = globalBook.id
          } else {
            // Insert new book
            const { data: newBook } = await supabaseAdmin
              .from('books')
              .insert({
                isbn: issue.isbn,
                title: issue.title || 'Unknown Title',
                box_id: session.box_id
              })
              .select('id')
              .single()
            if (newBook) bookId = newBook.id
          }
        }

        if (bookId) {
          // Flag the book as missing or extra in the books table
          const updateData = issue.type === 'missing' 
            ? { is_missing: true }
            : { is_extra: true }
            
          await supabaseAdmin
            .from('books')
            .update(updateData)
            .eq('id', bookId)

          // Insert into book_activity as non_processable with rejection_reason = issue.type
          await supabaseAdmin
            .from('book_activity')
            .insert({
              session_id: session_id,
              book_id: bookId,
              scan_status: 'non_processable',
              rejection_reason: issue.type, // 'missing' or 'extra'
              notes: `Marked as ${issue.type} during session completion`,
              scanned_by: scannedBy,
              scanned_by_name: scannedByName
            })
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('box_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', session_id)
      .select()
      .single()

    if (error) throw error

    res.json({ session: data })
  } catch (error) {
    console.error('Complete session error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Resume an existing session for a box (used by Inventory)
router.post('/boxes/:box_id/resume-session', requireAuth, async (req, res) => {
  try {
    const { box_id } = req.params
    
    // Find the latest session for this box
    const { data: session, error: fetchErr } = await supabaseAdmin
      .from('box_sessions')
      .select('*')
      .eq('box_id', box_id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchErr) throw fetchErr

    if (!session) {
      // Create a fallback session if none exists
      const { data: box } = await supabaseAdmin.from('boxes').select('lot_id').eq('id', box_id).single()
      if (!box) throw new Error('Box not found')

      const { data: newSession, error: createErr } = await supabaseAdmin
        .from('box_sessions')
        .insert({
          box_id: box_id,
          lot_id: box.lot_id,
          received_by: req.user.id,
          received_by_name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email,
          status: 'in_progress'
        })
        .select()
        .single()
      
      if (createErr) throw createErr
      return res.json({ session: newSession })
    }

    const { data, error } = await supabaseAdmin
      .from('box_sessions')
      .update({ status: 'in_progress' })
      .eq('id', session.id)
      .select()
      .single()

    if (error) throw error

    res.json({ session: data })
  } catch (error) {
    console.error('Resume session error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Cancel an existing session for a box (used by Inventory to reset verification)
router.post('/boxes/:box_id/cancel-session', requireAuth, async (req, res) => {
  try {
    const { box_id } = req.params
    
    // Find the latest session for this box
    const { data: session, error: fetchErr } = await supabaseAdmin
      .from('box_sessions')
      .select('*')
      .eq('box_id', box_id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!session) return res.json({ success: true, message: 'No session to cancel' })

    const { data, error } = await supabaseAdmin
      .from('box_sessions')
      .update({ status: 'received' })
      .eq('id', session.id)
      .select()
      .single()

    if (error) throw error

    res.json({ session: data })
  } catch (error) {
    console.error('Cancel session error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Delete/cancel a warehouse session
router.delete('/sessions/:session_id', requireAuth, async (req, res) => {
  try {
    const { session_id } = req.params

    const { data: session } = await supabaseAdmin
      .from('box_sessions')
      .select('box_id, lot_id')
      .eq('id', session_id)
      .single()

    if (session) {
      // First delete the session (cascades to scans usually, but we delete session first)
      await supabaseAdmin.from('box_sessions').delete().eq('id', session_id)
      
      // Attempt to delete the box if it has no other dependencies
      if (session.box_id) {
        await supabaseAdmin.from('boxes').delete().eq('id', session.box_id)

      }
    }

    res.json({ success: true, message: 'Session cancelled' })
  } catch (error) {
    console.error('Delete session error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get all warehouse sessions
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const { status, limit = 20 } = req.query

    let query = supabaseAdmin
      .from('box_sessions')
      .select(`
        *,
        box:boxes(box_number, lot:lots(lot_number))
      `)
      .order('started_at', { ascending: false })
      .limit(parseInt(limit))

    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) throw error

    res.json({ sessions: data })
  } catch (error) {
    console.error('Get sessions error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Search book by ISBN to find which box it's in
router.get('/search/isbn/:isbn', requireAuth, async (req, res) => {
  try {
    const { isbn } = req.params

    // First, try to get book details from iLMS API
    const { ilmsApi } = await import('../services/ilms-api.js')
    const ilmsResult = await ilmsApi.searchBookByISBN(isbn)

    let bookTitle = null
    let ilmsBoxNo = null
    let ilmsLotNo = null
    let ilmsExactMatch = null

    if (ilmsResult.success && ilmsResult.data) {
      // iLMS returns a general text search — filter to only the entry whose ISBN
      // exactly matches what was searched (case-insensitive, strip hyphens/spaces)
      const normalize = s => String(s || '').replace(/[-\s]/g, '').toLowerCase()
      const searchedNorm = normalize(isbn)

      const candidates = Array.isArray(ilmsResult.data)
        ? ilmsResult.data
        : [ilmsResult.data]

      ilmsExactMatch = candidates.find(
        item => item && !item.Message && normalize(item.ISBN) === searchedNorm
      ) || null

      if (ilmsExactMatch) {
        bookTitle = ilmsExactMatch.Title
        ilmsBoxNo = ilmsExactMatch.BoxNo
        ilmsLotNo = ilmsExactMatch.LotNo
      }
    }

    // Search in warehouse scan logs
    const { data: scans, error: scanError } = await supabaseAdmin
      .from('book_activity')
      .select(`
        *,
        books!inner(
          isbn,
          title,
          box:boxes(
            box_number,
            current_stage,
            lot:lots(lot_number)
          )
        )
      `)
      .eq('books.isbn', isbn)
      .order('scanned_at', { ascending: false })

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

    // If book found in iLMS (exact ISBN match) or database, return success
    const bookFound = ilmsExactMatch || book || (scans && scans.length > 0)

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
        scanned: scans && scans.length > 0,
        scan_count: scans?.length || 0,
        in_warehouse: inWarehouse,
        in_ilms: !!ilmsExactMatch
      },
      scans,
      currentLocation: book || null,
      ilmsData: ilmsExactMatch || null
    })
  } catch (error) {
    console.error('Search ISBN error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get non-processable (flagged) books
router.get('/rejected-books', requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query

    const { data: rejectedBooks, error } = await supabaseAdmin
      .from('book_activity')
      .select(`
        id,
        rejection_reason,
        scanned_at,
        scanned_by_name,
        books(
          isbn,
          title,
          box:boxes(
            box_number,
            lot:lots(lot_number)
          )
        )
      `)
      .eq('scan_status', 'non_processable')
      .order('scanned_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) throw error

    const mappedRejectedBooks = (rejectedBooks || []).map(rb => ({
      id: rb.id,
      isbn: rb.books?.isbn,
      title: rb.books?.title,
      rejection_reason: rb.rejection_reason,
      scanned_at: rb.scanned_at,
      scanned_by_name: rb.scanned_by_name,
      assigned_box: rb.books?.box
    }))

    res.json({ success: true, rejectedBooks: mappedRejectedBooks })
  } catch (error) {
    console.error('Error fetching non-processable books:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update an existing scan to non_processable (re-flag from scan log)
router.patch('/scans/:scan_id/flag', requireAuth, async (req, res) => {
  try {
    const { scan_id } = req.params
    const { rejection_reason, notes } = req.body

    if (!rejection_reason) {
      return res.status(400).json({ error: 'rejection_reason is required' })
    }

    // We need to fetch the existing scan to see its old status and session_id
    const { data: existingScan, error: fetchError } = await supabaseAdmin
      .from('book_activity')
      .select('id, scan_status, session_id')
      .eq('id', scan_id)
      .single()

    if (fetchError || !existingScan) return res.status(404).json({ error: 'Scan not found' })

    const { data, error } = await supabaseAdmin
      .from('book_activity')
      .update({ scan_status: 'non_processable', rejection_reason, notes: notes || null })
      .eq('id', scan_id)
      .select()
      .single()

    if (error) throw error

    // Adjust session counts if it changed from processable to non_processable
    if (existingScan.scan_status === 'processable') {
      const { data: session } = await supabaseAdmin
        .from('box_sessions')
        .select('total_accepted, total_rejected')
        .eq('id', existingScan.session_id)
        .single()
        
      if (session) {
        await supabaseAdmin
          .from('box_sessions')
          .update({
            total_accepted: Math.max(0, session.total_accepted - 1),
            total_rejected: session.total_rejected + 1
          })
          .eq('id', existingScan.session_id)
      }
    }

    res.json({ success: true, scan: data })
  } catch (error) {
    console.error('Flag scan error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Tag an ISBN scan as 'reject' or 'non_processable' with mandatory remarks
// POST /api/warehouse/scans/:scan_id/tag
// Body: { status: 'reject' | 'non_processable', remarks: string }
router.post('/scans/:scan_id/tag', requireAuth, async (req, res) => {
  try {
    const { scan_id } = req.params
    const { status, remarks } = req.body

    if (!status || !['reject', 'non_processable'].includes(status)) {
      return res.status(400).json({ error: "status must be 'reject' or 'non_processable'" })
    }
    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ error: 'remarks are required before tagging an ISBN' })
    }

    // Fetch the scan to verify it exists and get its session_id
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('book_activity')
      .select('id, scan_status, session_id, books(isbn)')
      .eq('id', scan_id)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Scan not found' })
    }

    const taggedBy = req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email

    // Update scan_status and rejection_reason
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('book_activity')
      .update({
        scan_status: status,
        rejection_reason: remarks.trim(),
        notes: `Tagged as ${status} by ${taggedBy}`
      })
      .eq('id', scan_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Adjust session counts if it changed from processable to non_processable (or reject)
    if (existing.scan_status === 'processable' && (status === 'non_processable' || status === 'reject')) {
      const { data: session } = await supabaseAdmin
        .from('box_sessions')
        .select('total_accepted, total_rejected')
        .eq('id', existing.session_id)
        .single()
        
      if (session) {
        await supabaseAdmin
          .from('box_sessions')
          .update({
            total_accepted: Math.max(0, session.total_accepted - 1),
            total_rejected: session.total_rejected + 1
          })
          .eq('id', existing.session_id)
      }
    }

    // Also upsert into qc_flags for audit trail
    await supabaseAdmin
      .from('qc_flags')
      .upsert({
        scan_id,
        issue: status,
        remarks: remarks.trim(),
        flagged_at: new Date().toISOString(),
        flagged_by_name: taggedBy,
      }, { onConflict: 'scan_id' })

    res.json({ success: true, scan: updated, message: `ISBN ${existing.books?.isbn} tagged as ${status}` })
  } catch (error) {
    console.error('Tag scan error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get warehouse scans for a specific box (for inventory comparison)
router.get('/boxes/:box_id/scans', requireAuth, async (req, res) => {
  try {
    const { box_id } = req.params

    // Get all warehouse scans for books in this box
    const { data: scans, error } = await supabaseAdmin
      .from('book_activity')
      .select(`
        *,
        books!inner(
          isbn,
          title,
          box:boxes(
            box_number,
            lot:lots(lot_number)
          )
        )
      `)
      .eq('books.box_id', box_id)
      .order('scanned_at', { ascending: false })

    if (error) throw error

    // Map to simpler format for comparison
    const warehouseBooks = scans.map(scan => ({
      id: scan.id,
      isbn: scan.books?.isbn,
      title: scan.books?.title,
      scan_status: scan.scan_status,
      rejection_reason: scan.rejection_reason,
      scanned_at: scan.scanned_at,
      scanned_by_name: scan.scanned_by_name
    }))

    res.json({ 
      success: true, 
      box_id,
      warehouse_books: warehouseBooks,
      total_count: warehouseBooks.length,
      processable_count: warehouseBooks.filter(b => b.scan_status === 'processable').length,
      non_processable_count: warehouseBooks.filter(b => b.scan_status === 'non_processable').length
    })
  } catch (error) {
    console.error('Get warehouse scans by box error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
