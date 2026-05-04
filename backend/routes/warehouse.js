import express from 'express'
import { supabase, supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

// Start a new warehouse receiving session
router.post('/sessions/start', requireAuth, async (req, res) => {
  try {
    const { lot_number } = req.body

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

    // Create warehouse session WITHOUT creating boxes upfront
    // Boxes will be created on-demand when first book is scanned
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('warehouse_sessions')
      .insert({
        box_id: null, // No receiving box yet
        lot_id: lot.id, // Store lot_id for box creation
        received_by: req.user.id,
        received_by_name: req.user.name || req.user.email,
        status: 'in_progress',
        accepted_box_id: null, // Will be created when first accepted book
        rejected_box_id: null  // Will be created when first rejected book
      })
      .select()
      .single()

    if (sessionError) throw sessionError

    res.status(201).json({ 
      session,
      lot_id: lot.id,
      lot_number: lot.lot_number,
      message: 'Session started. Boxes will be created as you scan books.'
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
      .from('warehouse_sessions')
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
      const { data: newBox } = await supabaseAdmin
        .from('boxes')
        .insert({
          box_number: boxNumber,
          lot_id: lotId,
          box_type: boxType,
          current_stage: 'warehouse',
          total_books: 0,
          is_sealed: false
        })
        .select()
        .single()
      
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

    // Get or create appropriate box based on scan status
    let assignedBoxId = null
    let currentBox = null
    
    if (scan_status === 'accepted') {
      // Check if we have an accepted box
      if (!session.accepted_box_id) {
        // Create first accepted box
        currentBox = await createBoxIfNeeded('accepted', lotNumber)
        assignedBoxId = currentBox.id
        // Update session with new box
        await supabaseAdmin
          .from('warehouse_sessions')
          .update({ accepted_box_id: currentBox.id })
          .eq('id', session_id)
      } else {
        // Check if current box is sealed (manually marked as full)
        const { data: boxData } = await supabaseAdmin
          .from('boxes')
          .select('*')
          .eq('id', session.accepted_box_id)
          .single()
        
        if (boxData && boxData.is_sealed) {
          // Box is sealed, create new one
          currentBox = await createBoxIfNeeded('accepted', lotNumber)
          assignedBoxId = currentBox.id
          // Update session with new box
          await supabaseAdmin
            .from('warehouse_sessions')
            .update({ accepted_box_id: currentBox.id })
            .eq('id', session_id)
        } else {
          assignedBoxId = session.accepted_box_id
          currentBox = boxData
        }
      }
    } else {
      // Same logic for rejected box
      if (!session.rejected_box_id) {
        currentBox = await createBoxIfNeeded('rejected', lotNumber)
        assignedBoxId = currentBox.id
        await supabaseAdmin
          .from('warehouse_sessions')
          .update({ rejected_box_id: currentBox.id })
          .eq('id', session_id)
      } else {
        const { data: boxData } = await supabaseAdmin
          .from('boxes')
          .select('*')
          .eq('id', session.rejected_box_id)
          .single()
        
        if (boxData && boxData.is_sealed) {
          // Box is sealed, create new one
          currentBox = await createBoxIfNeeded('rejected', lotNumber)
          assignedBoxId = currentBox.id
          await supabaseAdmin
            .from('warehouse_sessions')
            .update({ rejected_box_id: currentBox.id })
            .eq('id', session_id)
        } else {
          assignedBoxId = session.rejected_box_id
          currentBox = boxData
        }
      }
    }

    // Create scan log (use admin to bypass RLS)
    const { data: scanLog, error: scanError } = await supabaseAdmin
      .from('warehouse_book_scans')
      .insert({
        session_id,
        isbn,
        scan_status,
        rejection_reason,
        notes,
        title: scannedTitle || null,
        assigned_box_id: assignedBoxId,
        scanned_by: req.user.id,
        scanned_by_name: req.user.name || req.user.email
      })
      .select()
      .single()

    if (scanError) throw scanError

    // warehouse_book_scans is the source of truth — no books table writes needed

    // Update box counts (use admin to bypass RLS)
    if (assignedBoxId) {
      const { data: boxData } = await supabaseAdmin
        .from('boxes')
        .select('total_books')
        .eq('id', assignedBoxId)
        .single()
      
      if (boxData) {
        await supabaseAdmin
          .from('boxes')
          .update({ total_books: (boxData.total_books || 0) + 1 })
          .eq('id', assignedBoxId)
      }
    }

    res.status(201).json({ 
      scanLog,
      book: book || { isbn, found: false },
      currentBox: currentBox ? {
        box_number: currentBox.box_number,
        total_books: (currentBox.total_books || 0) + 1,
        is_sealed: currentBox.is_sealed
      } : null
    })
  } catch (error) {
    console.error('Scan book error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get session details with all scans
router.get('/sessions/:session_id', requireAuth, async (req, res) => {
  try {
    const { session_id } = req.params

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('warehouse_sessions')
      .select(`
        *,
        box:boxes(box_number, lot:lots(lot_number)),
        accepted_box:accepted_box_id(box_number),
        rejected_box:rejected_box_id(box_number),
        scans:warehouse_book_scans(*)
      `)
      .eq('id', session_id)
      .single()

    if (sessionError) throw sessionError
    if (!session) return res.status(404).json({ error: 'Session not found' })

    res.json({ session })
  } catch (error) {
    console.error('Get session error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Manually seal a box (mark as full)
router.post('/boxes/:box_id/seal', requireAuth, async (req, res) => {
  try {
    const { box_id } = req.params

    const { data, error } = await supabaseAdmin
      .from('boxes')
      .update({
        is_sealed: true,
        sealed_at: new Date().toISOString(),
        sealed_by: req.user.id
      })
      .eq('id', box_id)
      .select()
      .single()

    if (error) throw error

    res.json({ 
      box: data,
      message: `Box ${data.box_number} sealed successfully. Next scan will create a new box.`
    })
  } catch (error) {
    console.error('Seal box error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Complete a warehouse session
router.post('/sessions/:session_id/complete', requireAuth, async (req, res) => {
  try {
    const { session_id } = req.params

    const { data, error } = await supabaseAdmin
      .from('warehouse_sessions')
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

// Get all warehouse sessions
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const { status, limit = 20 } = req.query

    let query = supabaseAdmin
      .from('warehouse_sessions')
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

// Search book by ISBN to find which box it's in (PUBLIC - no auth required for Dashboard)
router.get('/search/isbn/:isbn', async (req, res) => {
  try {
    const { isbn } = req.params

    // First, try to get book details from iLMS API
    const { ilmsApi } = await import('../services/ilms-api.js')
    const ilmsResult = await ilmsApi.searchBookByISBN(isbn)
    
    let bookTitle = null
    let ilmsBoxNo = null
    let ilmsLotNo = null
    
    if (ilmsResult.success && ilmsResult.data && !ilmsResult.data.Message) {
      bookTitle = ilmsResult.data.Title
      ilmsBoxNo = ilmsResult.data.BoxNo
      ilmsLotNo = ilmsResult.data.LotNo
    }

    // Search in warehouse scan logs
    const { data: scans, error: scanError } = await supabaseAdmin
      .from('warehouse_book_scans')
      .select(`
        *,
        assigned_box:boxes!warehouse_book_scans_assigned_box_id_fkey(
          box_number,
          current_stage,
          lot:lots(lot_number)
        )
      `)
      .eq('isbn', isbn)
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
      boxNumber = latestScan.assigned_box?.box_number || null
      lotNumber = latestScan.assigned_box?.lot?.lot_number || null
      inWarehouse = true
    } else if (book) {
      boxNumber = book.box?.box_number || null
      lotNumber = book.box?.lot?.lot_number || null
      inWarehouse = true
    }

    // If book found in iLMS or database, return success
    const bookFound = (ilmsResult.success && ilmsResult.data && !ilmsResult.data.Message) || book || (scans && scans.length > 0)

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
        current_stage: scans?.[0]?.assigned_box?.current_stage || book?.current_stage || (inWarehouse ? 'Unknown' : 'Not scanned yet'),
        scanned: scans && scans.length > 0,
        scan_count: scans?.length || 0,
        in_warehouse: inWarehouse,
        in_ilms: ilmsResult.success && ilmsResult.data && !ilmsResult.data.Message
      },
      scans,
      currentLocation: book || null,
      ilmsData: ilmsResult.success ? ilmsResult.data : null
    })
  } catch (error) {
    console.error('Search ISBN error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get rejected books
router.get('/rejected-books', requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query

    const { data: rejectedBooks, error } = await supabaseAdmin
      .from('warehouse_book_scans')
      .select(`
        *,
        warehouse_sessions!inner(lot_id, lots(lot_number))
      `)
      .eq('scan_status', 'rejected')
      .order('scanned_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) throw error

    res.json({ success: true, rejectedBooks })
  } catch (error) {
    console.error('Error fetching rejected books:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get recent scans for inventory page
router.get('/scans/recent', async (req, res) => {
  try {
    const { limit = 50 } = req.query

    const { data: scans, error } = await supabaseAdmin
      .from('warehouse_book_scans')
      .select(`
        id,
        isbn,
        title,
        scan_status,
        scanned_at,
        warehouse_sessions(lot_id, lots(lot_number))
      `)
      .order('scanned_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) throw error

    // Format the response
    const formattedScans = scans.map(scan => ({
      id: scan.id,
      isbn: scan.isbn,
      title: scan.title || `ISBN: ${scan.isbn}`,
      scanned_at: scan.scanned_at,
      scan_status: scan.scan_status,
      lot_number: scan.warehouse_sessions?.lots?.lot_number || 'N/A'
    }))

    res.json({ success: true, scans: formattedScans })
  } catch (error) {
    console.error('Error fetching recent scans:', error)
    res.status(500).json({ error: error.message })
  }
})

// Backfill missing titles in warehouse_book_scans from iLMS
router.post('/backfill-titles', requireAuth, async (req, res) => {
  try {
    const { ilmsApi } = await import('../services/ilms-api.js')

    // Get all scans with no title
    const { data: scans, error } = await supabaseAdmin
      .from('warehouse_book_scans')
      .select('id, isbn')
      .is('title', null)

    if (error) throw error
    if (!scans || scans.length === 0) {
      return res.json({ success: true, updated: 0, message: 'No scans missing titles' })
    }

    let updated = 0
    let failed = 0

    for (const scan of scans) {
      try {
        const result = await ilmsApi.searchBookByISBN(scan.isbn)
        if (result.success && result.data && !result.data.Message && result.data.Title) {
          await supabaseAdmin
            .from('warehouse_book_scans')
            .update({ title: result.data.Title })
            .eq('id', scan.id)
          updated++
        } else {
          failed++
        }
      } catch (_) {
        failed++
      }
    }

    res.json({ success: true, total: scans.length, updated, failed })
  } catch (error) {
    console.error('Backfill titles error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
