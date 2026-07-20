import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../utils/logger.js';
import * as warehouseRepo from '../../repositories/warehouse.js';

export const startSessionService = async (req, res) => {
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
          type: req.body.type
            ? req.body.type.charAt(0).toUpperCase() + req.body.type.slice(1).toLowerCase()
            : 'Mustang'
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
        .select('id, total_expected_books, current_stage')
        .eq('lot_id', lot.id)
        .eq('box_number', boxName)
        .maybeSingle()

      if (existingBox) {
        if (!req.body.force) {
          if (existingBox.total_expected_books === 0) {
            return res.status(409).json({ 
              error: 'BoxExistsWithZeroBooks', 
              message: `Box ${boxName} in Lot ${lot.lot_number} already exists but has 0 books. Do you want to proceed?`,
              box: existingBox
            })
          } else {
            return res.status(409).json({ 
              error: 'BoxExistsWithBooks', 
              message: `Box ${boxName} in Lot ${lot.lot_number} already exists and contains ${existingBox.total_expected_books} books. You cannot start a new session for this box.`,
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
            total_expected_books: 0
          })
          .select()
          .single()

        if (boxCreateError) throw boxCreateError
        assignedBoxId = newBox.id

      }
    }

    if (!assignedBoxId) {
      return res.status(400).json({ error: 'A valid box is required to start a session.' })
    }

    // Create warehouse session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('box_sessions')
      .insert({
        box_id: assignedBoxId,
        warehouse_user_received: req.user.id,
        status: 'completed' // User requested to auto-complete session instead of in_progress
      })
      .select()
      .single()

    if (sessionError) throw sessionError

    res.status(201).json({ 
      session,
      lot_id: lot.id,
      lot_number: lot.lot_number,
      message: 'Session started with selected box.'
    })
  } catch (error) {
    logger.error('Start warehouse session error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const completeSessionService = async (req, res) => {
  try {
    const { session_id } = req.params
    let { total_expected_books, issues, stage, book_type } = req.body

    if (book_type) {
      book_type = book_type.charAt(0).toUpperCase() + book_type.slice(1).toLowerCase();
    }

    // Get session to find the associated box
    const { data: session, error: sessionFetchError } = await supabaseAdmin
      .from('box_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionFetchError) throw sessionFetchError

    // Update box based on stage
    if (session.box_id) {
      if (stage === 'inventory') {
          
        const { data: booksInBox } = await supabaseAdmin
          .from('books')
          .select('id')
          .eq('box_id', session.box_id)
          
        if (booksInBox && booksInBox.length > 0) {
          const bookIds = booksInBox.map(b => b.id)
          // Only stamp books that have not been individually scanned yet
          // (preserve the per-scan timestamp for books already scanned via /scan)
          await supabaseAdmin
            .from('book_activity')
            .update({
              inventory_scan_by: req.user.id,
              inventory_scan_at: new Date().toISOString()
            })
            .in('book_id', bookIds)
            .is('inventory_scan_at', null)
        }
      } else if (stage === 'qa' || stage === 'endorsement') {
        const { data: booksInBox } = await supabaseAdmin
          .from('books')
          .select('id')
          .eq('box_id', session.box_id)
          
        if (booksInBox && booksInBox.length > 0) {
          const bookIds = booksInBox.map(b => b.id)
          // Only stamp books that have not been individually scanned yet
          // (preserve the per-scan timestamp for books already scanned via /scan)
          await supabaseAdmin
            .from('book_activity')
            .update({
              endorsement_scan_by: req.user.id,
              endorsement_scan_at: new Date().toISOString()
            })
            .in('book_id', bookIds)
            .is('endorsement_scan_at', null)
        }
      }
      
      if (total_expected_books) {
        await supabaseAdmin
          .from('boxes')
          .update({ total_expected_books: parseInt(total_expected_books) })
          .eq('id', session.box_id)
      }
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
                box_id: session.box_id,
                book_type: book_type || null
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

          const { data: actData, error: actError } = await supabaseAdmin
            .from('book_activity')
            .insert({
              book_id: bookId,
              session_id: session.id,
              scan_status: 'non_processable',
              warehouse_scan_at: new Date().toISOString(),
              warehouse_scan_by: scannedBy
            })
            .select('id')
            .single()

          if (actError) {
            logger.error('Failed to log missing/extra book activity:', actError)
          } else {
            const flagInsert = {
              book_activity_id: actData.id,
              rejection_reason: issue.type,
              notes: `Marked as missing during session completion`
            }
            
            if (stage === 'inventory') flagInsert.inventory_flag_by = scannedBy;
            else if (stage === 'qa' || stage === 'endorsement') flagInsert.endorsement_flag_by = scannedBy;
            else flagInsert.warehouse_flag_by = scannedBy;

            await supabaseAdmin.from('user_flags').insert(flagInsert)
            
            if (b.flag_issue === 'extra-book') {
              const { error: bookUpdError } = await supabaseAdmin
                .from('books')
                .update({ is_extra: true })
                .eq('id', b.id);
              if (bookUpdError) throw bookUpdError;
            }
            if (b.flag_issue === 'mismatched-book') {
              const { error: bookUpdError } = await supabaseAdmin
                .from('books')
                .update({ is_mismatch: true })
                .eq('id', b.id);
              if (bookUpdError) throw bookUpdError;
            }
          }
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('box_sessions')
      .update({ status: 'completed' })
      .eq('id', session_id)
      .select()
      .single()

    if (error) throw error

    res.json({ session: data })
  } catch (error) {
    logger.error('Complete session error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const bulkSaveSessionService = async (req, res) => {
  try {
    let { lot_number, box_number, type, force, total_expected_books, issues, scanned_books, book_type } = req.body;
    
    if (book_type) {
      book_type = book_type.charAt(0).toUpperCase() + book_type.slice(1).toLowerCase();
    }

    // 1. Resolve Lot
    let lotQuery = supabaseAdmin.from('lots').select('id, lot_number').eq('lot_number', lot_number);
    if (book_type) lotQuery = lotQuery.eq('type', book_type);
    else lotQuery = lotQuery.is('type', null);
    
    let { data: lot, error: lotError } = await lotQuery.single()

    if (!lot) {
      const { data: newLot, error: createError } = await supabaseAdmin
        .from('lots')
        .insert({ lot_number, type: book_type || null, total_boxes: 0 })
        .select()
        .single()
      if (createError) throw createError;
      lot = newLot;
    }

    // 2. Resolve Box
    if (!box_number) {
      return res.status(400).json({ error: 'box_number is required' });
    }
    let assignedBoxId = null;
    let existingBox = null;
    let query = supabaseAdmin.from('boxes').select('id, total_expected_books, current_stage').eq('lot_id', lot.id).eq('box_number', box_number);
    if (book_type) query = query.eq('box_type', book_type);
    else query = query.is('box_type', null);
    
    const { data: box } = await query.maybeSingle();
    if (box) {
      // A box number must be unique within a lot. If a box with this number
      // already holds books, reject rather than silently merging into it.
      if (box.total_expected_books > 0) {
        return res.status(409).json({ error: `Box ${box_number} already exists in ${lot_number}. Please use a different box number.` });
      }
      assignedBoxId = box.id;
      existingBox = box;
    } else {
      const { data: newBox } = await supabaseAdmin
        .from('boxes')
        .insert({ box_number, lot_id: lot.id, box_type: book_type || null, current_stage: 'warehouse', total_expected_books: parseInt(total_expected_books) || 0 })
        .select()
        .single();
      assignedBoxId = newBox.id;
      existingBox = newBox;
    }

    // 3. Create Session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('box_sessions')
      .insert({
        box_id: assignedBoxId,
        warehouse_user_received: req.user.id,
        warehouse_time_received: new Date().toISOString(),
        status: 'completed',
        total_scanned_books: 0,
        total_accepted_books: 0,
        total_nonprocessable_books: 0
      })
      .select()
      .single();
    if (sessionError) throw sessionError;

    // 4. Save scanned books
    for (const b of (scanned_books || [])) {
      let bookId = null;
      let query = supabaseAdmin.from('books').select('id').eq('isbn', b.isbn);
      if (book_type) query = query.eq('book_type', book_type);
      else query = query.is('book_type', null);
      let { data: bData } = await query.limit(1).maybeSingle();
      if (bData) {
        bookId = bData.id;
      } else {
        const { data: bookData, error: bError } = await supabaseAdmin.from('books').insert({ isbn: b.isbn, title: b.title || 'Unknown Title', box_id: assignedBoxId, book_type: book_type || null }).select('id').single();
        if (bError) throw bError;
        if (bookData) bookId = bookData.id;
      }

      const { data: actData, error: actError } = await supabaseAdmin.from('book_activity').insert({
        book_id: bookId,
        session_id: session.id,
        scan_status: b.scan_status,
        warehouse_scan_at: new Date().toISOString(),
        warehouse_scan_by: req.user.id
      }).select('id').single();
      if (actError) throw actError;

      if (b.flag_issue || b.flag_remarks) {
        const flagInsert = { book_activity_id: actData.id, rejection_reason: b.flag_issue || null, notes: b.flag_remarks || null, warehouse_flag_by: req.user.id };
        const { error: fError } = await supabaseAdmin.from('user_flags').insert(flagInsert);
        if (fError) throw fError;

        if (b.flag_issue === 'extra-book') {
          const { error: bookUpdError } = await supabaseAdmin
            .from('books')
            .update({ is_extra: true })
            .eq('id', bookId);
          if (bookUpdError) throw bookUpdError;
        }
        if (b.flag_issue === 'mismatched-book') {
          const { error: bookUpdError } = await supabaseAdmin
            .from('books')
            .update({ is_mismatch: true })
            .eq('id', bookId);
          if (bookUpdError) throw bookUpdError;
        }
      }
    }

    // 5. Process issues (missing/extra)
    if (issues && issues.length > 0) {
      for (const issue of issues) {
        let query = supabaseAdmin.from('books').select('id').eq('isbn', issue.isbn);
        if (book_type) query = query.eq('book_type', book_type);
        else query = query.is('book_type', null);
        let { data: globalBook } = await query.limit(1).maybeSingle();
        let bookId = globalBook?.id;
        if (!bookId) {
           const { data: newBook, error: nbError } = await supabaseAdmin.from('books').insert({ isbn: issue.isbn, title: issue.title || 'Unknown', box_id: assignedBoxId, book_type: book_type || null }).select('id').single();
           if (nbError) throw nbError;
           if (newBook) bookId = newBook.id;
        }

        const updateData = issue.type === 'missing' ? { is_missing: true } : { is_extra: true };
        const { error: upError } = await supabaseAdmin.from('books').update(updateData).eq('id', bookId);
        if (upError) throw upError;

        const { data: actData, error: actError } = await supabaseAdmin.from('book_activity').insert({
          book_id: bookId,
          session_id: session.id,
          scan_status: 'non_processable',
          warehouse_scan_at: new Date().toISOString(),
          warehouse_scan_by: req.user.id
        }).select('id').single();
        if (actError) throw actError;

        const flagInsert = { book_activity_id: actData.id, rejection_reason: issue.type, notes: `Marked as missing during session bulk-complete`, warehouse_flag_by: req.user.id };
        const { error: flError } = await supabaseAdmin.from('user_flags').insert(flagInsert);
        if (flError) throw flError;
      }
    }

    if (total_expected_books && existingBox) {
      await supabaseAdmin.from('boxes').update({ total_expected_books: parseInt(total_expected_books) }).eq('id', assignedBoxId);
    }

    res.status(201).json({ success: true, session });
  } catch (error) {
    logger.error('Bulk save error:', error);
    res.status(500).json({ error: error.message });
  }
}

export const resumeSessionService = async (req, res) => {
  try {
    const { box_id } = req.params
    
    // Find the latest session for this box
    const { data: session, error: fetchErr } = await supabaseAdmin
      .from('box_sessions')
      .select('*')
      .eq('box_id', box_id)
      .order('warehouse_time_received', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchErr) throw fetchErr

    if (!session) {
      // Create a fallback session if none exists (box was received without a proper session)
      const { data: box } = await supabaseAdmin.from('boxes').select('lot_id').eq('id', box_id).single()
      if (!box) throw new Error('Box not found')

      const { data: newSession, error: createErr } = await supabaseAdmin
        .from('box_sessions')
        .insert({
          box_id: box_id,
          inventory_user_received: req.user.id,
          inventory_time_received: new Date().toISOString(),
          status: 'received'
        })
        .select()
        .single()
      
      if (createErr) throw createErr
      return res.json({ session: newSession })
    }

    // Just return the existing session — do NOT change its status
    res.json({ session })
  } catch (error) {
    logger.error('Resume session error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const cancelSessionService = async (req, res) => {
  try {
    const { box_id } = req.params
    
    // Find the latest session for this box
    const { data: session, error: fetchErr } = await supabaseAdmin
      .from('box_sessions')
      .select('*')
      .eq('box_id', box_id)
      .order('warehouse_time_received', { ascending: false })
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
    logger.error('Cancel session error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const deleteSessionService = async (req, res) => {
  try {
    const { session_id } = req.params

    const { data: session } = await supabaseAdmin
      .from('box_sessions')
      .select('box_id')
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
    logger.error('Delete session error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const listSessionsService = async (req, res) => {
  try {
    const { status, limit = 20 } = req.query

    let query = supabaseAdmin
      .from('box_sessions')
      .select(`
        *,
        box:boxes(box_number, lot:lots(lot_number))
      `)
      .order('warehouse_time_received', { ascending: false })
      .limit(parseInt(limit))

    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) throw error

    res.json({ sessions: data })
  } catch (error) {
    logger.error('Get sessions error:', error)
    res.status(500).json({ error: error.message })
  }
}

