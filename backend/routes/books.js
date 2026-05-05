import express from 'express'
import { supabase, supabaseAdmin } from '../config/supabase.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { ilmsApi } from '../services/ilms-api.js'

const router = express.Router()

// Get all books (with optional filters)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { box_id, isbn, status, is_unaccounted } = req.query

    let query = supabase
      .from('books')
      .select(`
        *,
        box:boxes(box_number, lot_id, lot:lots(lot_number))
      `)
      .order('created_at', { ascending: false })

    if (box_id) query = query.eq('box_id', box_id)
    if (isbn) query = query.eq('isbn', isbn)
    if (status) query = query.eq('status', status)
    if (is_unaccounted) query = query.eq('is_unaccounted', is_unaccounted === 'true')

    const { data, error } = await query

    if (error) throw error

    res.json({ books: data })
  } catch (error) {
    console.error('Get books error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get single book by ISBN
router.get('/isbn/:isbn', requireAuth, async (req, res) => {
  try {
    const { isbn } = req.params

    const { data, error } = await supabase
      .from('books')
      .select(`
        *,
        box:boxes(box_number, lot_id, lot:lots(lot_number, shipment:shipments(shipment_code)))
      `)
      .eq('isbn', isbn)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Book not found' })
    }

    res.json({ book: data[0] })
  } catch (error) {
    console.error('Get book by ISBN error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Create new book (manual entry or from client API)
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      isbn,
      barcode,
      box_id,
      title,
      description,
      project_name,
      book_type,
      publisher,
      language,
      page_count,
      condition,
      date_purchased,
      date_catalogued
    } = req.body

    if (!isbn) {
      return res.status(400).json({ error: 'ISBN is required' })
    }

    const { data, error } = await supabase
      .from('books')
      .insert({
        isbn,
        barcode: barcode || isbn,
        box_id,
        title,
        description,
        project_name,
        book_type,
        publisher,
        language,
        page_count,
        condition,
        date_purchased,
        date_catalogued,
        status: 'pending',
        current_stage: 'intake',
        is_transmitted: false,
        is_unaccounted: false
      })
      .select()
      .single()

    if (error) throw error

    // Update box book count
    if (box_id) {
      await supabase.rpc('increment_box_books', { box_id_param: box_id })
    }

    res.status(201).json({ book: data })
  } catch (error) {
    console.error('Create book error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update book
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const updateData = { ...req.body }

    // Remove fields that shouldn't be updated directly
    delete updateData.id
    delete updateData.created_at

    const { data, error } = await supabase
      .from('books')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ book: data })
  } catch (error) {
    console.error('Update book error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Mark book as transmitted
router.post('/:id/transmit', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('books')
      .update({
        is_transmitted: true,
        status: 'transmitted',
        current_stage: 'transmit'
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Update box transmitted count
    if (data.box_id) {
      await supabase.rpc('increment_box_transmitted', { box_id_param: data.box_id })
    }

    res.json({ book: data })
  } catch (error) {
    console.error('Transmit book error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Mark book as unaccounted
router.post('/:id/unaccounted', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { stage_detected, notes } = req.body

    // Update book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .update({ is_unaccounted: true })
      .eq('id', id)
      .select(`
        *,
        box:boxes(lot:lots(lot_number))
      `)
      .single()

    if (bookError) throw bookError

    // Create unaccounted log entry
    const { error: logError } = await supabase
      .from('unaccounted_books')
      .insert({
        book_id: id,
        isbn: book.isbn,
        lot_number: book.box?.lot?.lot_number || 'Unknown',
        stage_detected: stage_detected || book.current_stage,
        reported_by: req.user.id,
        reported_by_name: req.user.name || req.user.email,
        notes,
        resolved: false
      })

    if (logError) throw logError

    res.json({ book })
  } catch (error) {
    console.error('Mark unaccounted error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Scan book (for Inventory Gate)
router.post('/scan', requireAuth, async (req, res) => {
  try {
    const { isbn, barcode } = req.body

    if (!isbn && !barcode) {
      return res.status(400).json({ error: 'ISBN or barcode is required' })
    }

    // Find book by ISBN or barcode
    let query = supabase
      .from('books')
      .select(`
        *,
        box:boxes(box_number, lot:lots(lot_number, shipment:shipments(shipment_code)))
      `)

    if (isbn) {
      query = query.eq('isbn', isbn)
    } else {
      query = query.eq('barcode', barcode)
    }

    const { data, error } = await query.limit(1)

    if (error) throw error

    const book = data && data.length > 0 ? data[0] : null

    // Log scan in history
    await supabase.from('scan_history').insert({
      book_id: book?.id,
      isbn: isbn || barcode,
      barcode: barcode || isbn,
      scanned_by: req.user.id,
      scanned_by_name: req.user.name || req.user.email,
      slip_printed: false,
      title: book?.title,
      box_number: book?.box?.box_number,
      lot_number: book?.box?.lot?.lot_number
    })

    // Update book scan timestamp
    if (book) {
      await supabase
        .from('books')
        .update({ date_scanned: new Date().toISOString() })
        .eq('id', book.id)
    }

    res.json({ 
      book,
      found: !!book
    })
  } catch (error) {
    console.error('Scan book error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Test iLMS API - Search book by ISBN from client's system
router.get('/ilms/search/:isbn', async (req, res) => {
  try {
    const { isbn } = req.params

    console.log('🔍 Searching iLMS API for ISBN:', isbn)

    const result = await ilmsApi.searchBookByISBN(isbn)

    if (result.success) {
      console.log('✅ iLMS API response received')
      res.json({
        success: true,
        source: 'iLMS API',
        data: result.data
      })
    } else {
      console.log('❌ iLMS API error:', result.error)
      res.status(404).json({
        success: false,
        error: result.error,
        message: 'Book not found in iLMS system'
      })
    }
  } catch (error) {
    console.error('iLMS API test error:', error)
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
})

// Mark slip as printed
router.post('/scan/:id/print', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('scan_history')
      .update({
        slip_printed: true,
        printed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    res.json({ success: true })
  } catch (error) {
    console.error('Mark printed error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get existing QC flags for a list of scan IDs
router.get('/flags', requireAuth, async (req, res) => {
  try {
    const { scan_ids } = req.query
    const db = supabaseAdmin || supabase

    let query = db.from('qc_flags').select('scan_id, issue, remarks, flagged_at, flagged_by_name')
    if (scan_ids) {
      const ids = scan_ids.split(',').filter(Boolean)
      query = query.in('scan_id', ids)
    }

    const { data, error } = await query
    if (error) throw error
    res.json({ success: true, flags: data || [] })
  } catch (error) {
    console.error('Get flags error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Flag a book with a QC issue (from Book Inspection page)
// :id is a warehouse_book_scans row ID
router.post('/:id/flag', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { issue, remarks, box_id } = req.body
    const db = supabaseAdmin || supabase

    if (!issue) return res.status(400).json({ error: 'issue is required' })

    // Look up the scan record (source of truth for scanned books)
    const { data: scan, error: scanError } = await db
      .from('warehouse_book_scans')
      .select('id, isbn, title, assigned_box_id')
      .eq('id', id)
      .single()

    if (scanError || !scan) return res.status(404).json({ error: 'Scan record not found' })

    // Insert a QC flag record (log it, don't delete the scan)
    const { error: flagError } = await db
      .from('qc_flags')
      .upsert({
        scan_id: id,
        isbn: scan.isbn,
        title: scan.title,
        box_id: scan.assigned_box_id || box_id || null,
        issue,
        remarks: remarks || null,
        flagged_by: req.user.id,
        flagged_by_name: req.user.user_metadata?.name || req.user.email
      }, { onConflict: 'scan_id' })

    if (flagError) {
      console.error('QC flag insert error:', flagError)
      return res.status(500).json({ error: flagError.message })
    }

    res.json({ success: true, scan_id: id, issue, remarks })
  } catch (error) {
    console.error('Flag book error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
