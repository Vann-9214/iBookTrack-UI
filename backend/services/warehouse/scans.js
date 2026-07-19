import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../utils/logger.js';
import * as warehouseRepo from '../../repositories/warehouse.js';

export const scanBookService = async (req, res) => {
  try {
    const { session_id } = req.params
    let { isbn, title: scannedTitle, scan_status, rejection_reason, notes, book_type } = req.body

    if (book_type) {
      book_type = book_type.charAt(0).toUpperCase() + book_type.slice(1).toLowerCase();
    }

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

    // Removed the 'in_progress' check here because sessions are now auto-completed upon start.

    // Get lot_id and lot_number from the box
    if (!session.box_id) {
      return res.status(400).json({ error: 'Session does not have a box assigned' })
    }

    const { data: boxDetails } = await supabaseAdmin
      .from('boxes')
      .select('lot_id')
      .eq('id', session.box_id)
      .single()

    const lotId = boxDetails?.lot_id
    
    if (!lotId) {
      return res.status(400).json({ error: 'Box does not have a lot assigned' })
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
      let boxTypeStr = boxType ? `${boxType.toUpperCase()}-` : ''
      return `${lotNumber}-${boxTypeStr}${String(nextNum).padStart(4, '0')}`
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
          total_expected_books: 0
        })
        .select()
        .single()

      if (boxInsertError) {
        logger.error('Box insert error:', boxInsertError)
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
      currentBox = await createBoxIfNeeded(book_type || null, lotNumber)
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

      assignedBoxId = session.box_id
      currentBox = boxData
    }

    // Find existing book in the box or insert a new one to get book_id
    let bookId = null
    if (assignedBoxId) {
      let { data: existingBook } = await supabaseAdmin
        .from('books')
        .select('id')
        .eq('isbn', isbn)
        .eq('box_id', assignedBoxId)
        .maybeSingle()
        
      if (existingBook) {
        bookId = existingBook.id
      } else {
        const { data: bookData, error: bookInsertError } = await supabaseAdmin
          .from('books')
          .insert({
            isbn,
            box_id: assignedBoxId,
            title: scannedTitle || null,
            book_type: book_type || null
          })
          .select('id')
          .single()
        
        if (bookInsertError) {
          logger.error('Books insert error:', bookInsertError)
          throw bookInsertError
        }
        if (bookData) {
          bookId = bookData.id
        }
      }
    }

    const stage = currentBox?.current_stage || 'warehouse';
    
    // Set the appropriate scan_by field based on the current stage
    const activityInsert = {
      session_id,
      book_id: bookId,
      scan_status
    };
    
    if (stage === 'inventory') {
      activityInsert.inventory_scan_by = req.user.id;
      activityInsert.inventory_scan_at = new Date().toISOString();
    }
    else if (stage === 'qa' || stage === 'endorsement') {
      activityInsert.endorsement_scan_by = req.user.id;
      activityInsert.endorsement_scan_at = new Date().toISOString();
    }
    else {
      activityInsert.warehouse_scan_by = req.user.id;
      // warehouse_scan_at defaults to NOW() in DB usually, but we can set it
      // actually the DB handles warehouse_scan_at via default value, but just in case:
      // activityInsert.warehouse_scan_at is handled by DB
    }

    // Check if book_activity already exists for this book in this session
    let existingActivity = null;
    if (bookId) {
      const { data } = await supabaseAdmin
        .from('book_activity')
        .select('id')
        .eq('book_id', bookId)
        .eq('session_id', session_id)
        .maybeSingle();
      if (data) existingActivity = data;
    }

    let scanLog;
    if (existingActivity) {
      const { data, error: scanError } = await supabaseAdmin
        .from('book_activity')
        .update(activityInsert)
        .eq('id', existingActivity.id)
        .select('id, scan_status, warehouse_scan_by')
        .single();
      if (scanError) throw scanError;
      scanLog = data;
    } else {
      const { data, error: scanError } = await supabaseAdmin
        .from('book_activity')
        .insert(activityInsert)
        .select('id, scan_status, warehouse_scan_by')
        .single();
      if (scanError) throw scanError;
      scanLog = data;
    }

    // Now insert user_flags if needed, linking back to the book_activity
    if (rejection_reason || notes) {
      const flagInsert = {
        book_activity_id: scanLog.id,
        rejection_reason: rejection_reason || null,
        notes: notes || null
      };
      
      if (stage === 'inventory') flagInsert.inventory_flag_by = req.user.id;
      else if (stage === 'qa' || stage === 'endorsement') flagInsert.endorsement_flag_by = req.user.id;
      else flagInsert.warehouse_flag_by = req.user.id;

      const { error: flagError } = await supabaseAdmin
        .from('user_flags')
        .insert(flagInsert);
      if (flagError) throw flagError;

      if (rejection_reason === 'extra-book') {
        const { error: bookUpdError } = await supabaseAdmin
          .from('books')
          .update({ is_extra: true })
          .eq('id', scanLog.book_id || bookId);
        if (bookUpdError) throw bookUpdError;
      }
      if (rejection_reason === 'mismatched-book') {
        const { error: bookUpdError } = await supabaseAdmin
          .from('books')
          .update({ is_mismatch: true })
          .eq('id', scanLog.book_id || bookId);
        if (bookUpdError) throw bookUpdError;
      }
    }

    res.status(201).json({ 
      scanLog,
      currentBox: currentBox ? {
        box_number: currentBox.box_number
      } : null
    })
  } catch (error) {
    logger.error('Scan book error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const flagScanService = async (req, res) => {
  try {
    const { scan_id } = req.params
    const { rejection_reason, notes } = req.body

    if (!rejection_reason) {
      return res.status(400).json({ error: 'rejection_reason is required' })
    }

    // We need to fetch the existing scan to see its old status and session_id
    const { data: existingScan, error: fetchError } = await supabaseAdmin
      .from('book_activity')
      .select('id, scan_status, session_id, book_id')
      .eq('id', scan_id)
      .single()

    if (fetchError || !existingScan) return res.status(404).json({ error: 'Scan not found' })

    // Get the box stage to assign the correct flag column
    const { data: session } = await supabaseAdmin
      .from('box_sessions')
      .select('box_id')
      .eq('id', existingScan.session_id)
      .single();
    
    let stage = 'warehouse';
    if (session?.box_id) {
      const { data: box } = await supabaseAdmin.from('boxes').select('current_stage').eq('id', session.box_id).single();
      if (box?.current_stage) stage = box.current_stage;
    }

    const flagInsert = { 
      book_activity_id: existingScan.id,
      rejection_reason, 
      notes: notes || null
    };
    if (stage === 'inventory') flagInsert.inventory_flag_by = req.user.id;
    else if (stage === 'qa' || stage === 'endorsement') flagInsert.endorsement_flag_by = req.user.id;
    else flagInsert.warehouse_flag_by = req.user.id;

    const { data: flagData, error: flagError } = await supabaseAdmin
      .from('user_flags')
      .insert(flagInsert)
      .select('id')
      .single()
    if (flagError) throw flagError;

    if (rejection_reason === 'extra-book') {
      const { error: bookUpdError } = await supabaseAdmin
        .from('books')
        .update({ is_extra: true })
        .eq('id', existingScan.book_id);
      if (bookUpdError) throw bookUpdError;
    }
    if (rejection_reason === 'mismatched-book') {
      const { error: bookUpdError } = await supabaseAdmin
        .from('books')
        .update({ is_mismatch: true })
        .eq('id', existingScan.book_id);
      if (bookUpdError) throw bookUpdError;
    }

    const { data, error } = await supabaseAdmin
      .from('book_activity')
      .update({ scan_status: 'non_processable' })
      .eq('id', scan_id)
      .select()
      .single()

    if (error) throw error

    // Adjust session counts if it changed from processable to non_processable
    if (existingScan.scan_status === 'processable') {
      const { data: session } = await supabaseAdmin
        .from('box_sessions')
        .select('total_accepted_books, total_nonprocessable_books')
        .eq('id', existingScan.session_id)
        .single()
        
      if (session) {
        await supabaseAdmin
          .from('box_sessions')
          .update({
            total_accepted_books: Math.max(0, session.total_accepted_books - 1),
            total_nonprocessable_books: session.total_nonprocessable_books + 1
          })
          .eq('id', existingScan.session_id)
      }
    }

    res.json({ success: true, scan: data })
  } catch (error) {
    logger.error('Flag scan error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const tagScanService = async (req, res) => {
  try {
    const { scan_id } = req.params
    const { status, remarks } = req.body

    // Fetch the scan to verify it exists and get its session_id
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('book_activity')
      .select('id, scan_status, session_id, book_id, books(isbn)')
      .eq('id', scan_id)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Scan not found' })
    }

    const taggedBy = req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email

    // Get the box stage
    const { data: session } = await supabaseAdmin
      .from('box_sessions')
      .select('box_id')
      .eq('id', existing.session_id)
      .single();
    
    let stage = 'warehouse';
    if (session?.box_id) {
      const { data: box } = await supabaseAdmin.from('boxes').select('current_stage').eq('id', session.box_id).single();
      if (box?.current_stage) stage = box.current_stage;
    }

    const flagInsert = {
      book_activity_id: existing.id,
      rejection_reason: remarks.trim(),
      notes: `Tagged as ${status} by ${taggedBy}`
    };
    if (stage === 'inventory') flagInsert.inventory_flag_by = req.user.id;
    else if (stage === 'qa' || stage === 'endorsement') flagInsert.endorsement_flag_by = req.user.id;
    else if (stage === 'scan') flagInsert.scan_flag_by = req.user.id;
    else flagInsert.warehouse_flag_by = req.user.id;

    const { data: flagData, error: flagError } = await supabaseAdmin
      .from('user_flags')
      .insert(flagInsert)
      .select('id')
      .single();
    if (flagError) throw flagError;

    if (remarks.trim() === 'extra-book') {
      const { error: bookUpdError } = await supabaseAdmin
        .from('books')
        .update({ is_extra: true })
        .eq('id', existing.book_id);
      if (bookUpdError) throw bookUpdError;
    }
    if (remarks.trim() === 'mismatched-book') {
      const { error: bookUpdError } = await supabaseAdmin
        .from('books')
        .update({ is_mismatch: true })
        .eq('id', existing.book_id);
      if (bookUpdError) throw bookUpdError;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('book_activity')
      .update({
        scan_status: status
      })
      .eq('id', scan_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Adjust session counts if it changed from processable to non_processable (or reject)
    if (existing.scan_status === 'processable' && (status === 'non_processable' || status === 'reject')) {
      const { data: session } = await supabaseAdmin
        .from('box_sessions')
        .select('total_accepted_books, total_nonprocessable_books')
        .eq('id', existing.session_id)
        .single()
        
      if (session) {
        await supabaseAdmin
          .from('box_sessions')
          .update({
            total_accepted_books: Math.max(0, session.total_accepted_books - 1),
            total_nonprocessable_books: session.total_nonprocessable_books + 1
          })
          .eq('id', existing.session_id)
      }
    }

    res.json({ success: true, scan: updated, message: `ISBN ${existing.books?.isbn} tagged as ${status}` })
  } catch (error) {
    logger.error('Tag scan error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const getBoxScansService = async (req, res) => {
  try {
    const { box_id } = req.params

    // Get all warehouse scans for books in this box
    const { data: scans, error } = await supabaseAdmin
      .from('book_activity')
      .select(`
        *,
        user_flags(rejection_reason),
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
      .order('warehouse_scan_at', { ascending: false })

    if (error) throw error

    // Map to simpler format for comparison
    const warehouseBooks = scans.map(scan => ({
      id: scan.id,
      isbn: scan.books?.isbn,
      title: scan.books?.title,
      scan_status: scan.scan_status,
      rejection_reason: (Array.isArray(scan.user_flags) ? scan.user_flags[0] : scan.user_flags)?.rejection_reason || null,
      warehouse_scan_at: scan.warehouse_scan_at
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
    logger.error('Get warehouse scans by box error:', error)
    res.status(500).json({ error: error.message })
  }
}

