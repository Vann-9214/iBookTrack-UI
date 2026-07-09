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
    console.error('Start warehouse session error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Scan a book in the warehouse
router.post('/sessions/:session_id/scan', requireAuth, async (req, res) => {
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

      if (boxData && boxData.is_sealed && boxData.current_stage === 'warehouse') {
        // Box is full — create a new one and update session
        currentBox = await createBoxIfNeeded(book_type || null, lotNumber)
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
          console.error('Books insert error:', bookInsertError)
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
    }

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
    let { total_books_expected, issues, stage, book_type } = req.body

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
        // Mark box as sealed so it's recognized as verified by inventory
        await supabaseAdmin
          .from('boxes')
          .update({ is_sealed: true })
          .eq('id', session.box_id)
          
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
      
      if (total_books_expected) {
        await supabaseAdmin
          .from('boxes')
          .update({ total_books_expected: parseInt(total_books_expected) })
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
            console.error('Failed to log missing/extra book activity:', actError)
          } else {
            const flagInsert = {
              book_activity_id: actData.id,
              rejection_reason: issue.type,
              notes: `Marked as ${issue.type} during session completion`
            }
            
            if (stage === 'inventory') flagInsert.inventory_flag_by = scannedBy;
            else if (stage === 'qa' || stage === 'endorsement') flagInsert.endorsement_flag_by = scannedBy;
            else flagInsert.warehouse_flag_by = scannedBy;

            await supabaseAdmin.from('user_flags').insert(flagInsert)
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
    console.error('Complete session error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Bulk save a complete session in one request
router.post('/sessions/bulk-save', requireAuth, async (req, res) => {
  try {
    let { lot_number, box_number, type, force, total_books_expected, issues, scanned_books, book_type } = req.body;
    
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
    let query = supabaseAdmin.from('boxes').select('id, total_books_expected, current_stage').eq('lot_id', lot.id).eq('box_number', box_number);
    if (book_type) query = query.eq('box_type', book_type);
    else query = query.is('box_type', null);
    
    const { data: box } = await query.maybeSingle();
    if (box) {
      // A box number must be unique within a lot. If a box with this number
      // already holds books, reject rather than silently merging into it.
      if (box.total_books_expected > 0) {
        return res.status(409).json({ error: `Box ${box_number} already exists in ${lot_number}. Please use a different box number.` });
      }
      assignedBoxId = box.id;
      existingBox = box;
    } else {
      const { data: newBox } = await supabaseAdmin
        .from('boxes')
        .insert({ box_number, lot_id: lot.id, box_type: book_type || null, current_stage: 'warehouse', total_books_expected: parseInt(total_books_expected) || 0, is_sealed: false })
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
        total_scanned: 0,
        total_accepted: 0,
        total_rejected: 0
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

        const flagInsert = { book_activity_id: actData.id, rejection_reason: issue.type, notes: `Marked as ${issue.type} during session bulk-complete`, warehouse_flag_by: req.user.id };
        const { error: flError } = await supabaseAdmin.from('user_flags').insert(flagInsert);
        if (flError) throw flError;
      }
    }

    if (total_books_expected && existingBox) {
      await supabaseAdmin.from('boxes').update({ total_books_expected: parseInt(total_books_expected) }).eq('id', assignedBoxId);
    }

    res.status(201).json({ success: true, session });
  } catch (error) {
    console.error('Bulk save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resume an existing session for a box (used by Inventory)
router.post('/boxes/:box_id/resume-session', requireAuth, async (req, res) => {
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
      .order('warehouse_time_received', { ascending: false })
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

// Fetch historical lots from Supabase (instead of live from iLMS)
// Used to populate the Lot dropdown on the session start screen
router.get('/ilms-lots', requireAuth, async (req, res) => {
  try {
    // We now just fetch distinct lots from our local database rather than pinging iLMS
    const { data: lots, error } = await supabaseAdmin
      .from('lots')
      .select('lot_number, type')
      .order('created_at', { ascending: false })
      .limit(100) // fetch up to 100 recent lots

    if (error) throw error

    // Format them for the frontend
    const formattedLots = lots.map(l => ({
      lot_number: l.lot_number,
      type: l.type,
      boxes: [] // we no longer pre-fetch boxes, users manually type them
    }))

    res.json({ success: true, lots: formattedLots })
  } catch (error) {
    console.error('fetch historical lots error:', error)
    res.status(500).json({ success: false, error: error.message, lots: [] })
  }
})

// Check whether a box_number already exists within a given lot (and brand/type).
// Used by the warehouse UI to prevent starting a session with a duplicate box
// number in the same lot.
router.get('/box-exists', requireAuth, async (req, res) => {
  try {
    let { lot_number, box_number, type } = req.query

    if (!lot_number || !box_number) {
      return res.status(400).json({ error: 'lot_number and box_number are required' })
    }

    let book_type = null
    if (type) {
      book_type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
    }

    // Resolve the lot (matching the same type-scoping rules as bulk-save)
    let lotQuery = supabaseAdmin.from('lots').select('id').eq('lot_number', lot_number)
    if (book_type) lotQuery = lotQuery.eq('type', book_type)
    else lotQuery = lotQuery.is('type', null)

    const { data: lot } = await lotQuery.maybeSingle()

    // If the lot doesn't exist yet, no boxes can exist inside it.
    if (!lot) {
      return res.json({ success: true, exists: false })
    }

    let boxQuery = supabaseAdmin.from('boxes').select('id').eq('lot_id', lot.id).eq('box_number', box_number)
    if (book_type) boxQuery = boxQuery.eq('box_type', book_type)
    else boxQuery = boxQuery.is('box_type', null)

    const { data: box } = await boxQuery.maybeSingle()

    res.json({ success: true, exists: !!box })
  } catch (error) {
    console.error('box-exists check error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ── SSE: persistent ISBN lookup stream ───────────────────────────────────────
// Opens one long-lived connection. Client sends ?isbn=<value> to trigger a
// lookup; the server pushes back a single SSE event with the result.
// Connection stays open indefinitely until the client disconnects.
router.get('/isbn-stream', requireAuth, async (req, res) => {
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
      const { ilmsApi } = await import('../services/ilms-api.js')
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
})



// ISBN lookup triggered over SSE — client POSTs here with { isbn } body
// and the SSE connection receives the result as an event
router.post('/isbn-stream/query', requireAuth, async (req, res) => {
  const { isbn, type, allowExisting } = req.body
  if (!isbn) return res.status(400).json({ error: 'isbn is required' })

  const digits = isbn.replace(/[^0-9]/g, '')
  if (digits.length !== 10 && digits.length !== 13) {
    return res.status(400).json({ success: false, error: 'Invalid ISBN. Must be 10 or 13 digits.' })
  }

  try {
    const { supabaseAdmin } = await import('../config/supabase.js');

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

    const { ilmsApi } = await import('../services/ilms-api.js')
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
    let ilmsData = null

    if (ilmsResult.success && ilmsResult.data) {
      ilmsData = ilmsResult.data
      bookTitle = ilmsData.Title
      ilmsBoxNo = ilmsData.BoxNo
      ilmsLotNo = ilmsData.LotNo
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
    console.error('Search ISBN error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get non-processable (flagged) books
router.get('/rejected-books', requireAuth, async (req, res) => {
  try {
    const { limit = 50, today } = req.query
    const requestedLimit = Math.min(parseInt(limit) || 50, 50)

    // Fetch a generous pool so we can filter by today's latest flag and still return 10
    const fetchLimit = today === 'true' ? requestedLimit * 5 : requestedLimit

    const { data: userFlags, error } = await supabaseAdmin
      .from('user_flags')
      .select(`
        id,
        rejection_reason,
        notes,
        warehouse_flag_by,
        warehouse_flag_at,
        inventory_flag_by,
        inventory_flag_at,
        endorsement_flag_by,
        endorsement_flag_at,
        warehouse_user:profiles!warehouse_flag_by(name),
        inventory_user:profiles!inventory_flag_by(name),
        endorsement_user:profiles!endorsement_flag_by(name),
        book_activity(
          id,
          warehouse_scan_at,
          books!inner(
            isbn,
            title,
            box:boxes(
              box_number,
              lot:lots(lot_number)
            )
          )
        )
      `)
      .order('warehouse_flag_at', { ascending: false })
      .limit(fetchLimit)

    if (error) throw error

    const firstRel = (rel) => Array.isArray(rel) ? rel[0] : rel

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    let mappedRejectedBooks = (userFlags || []).map(uf => {
      const ba = firstRel(uf.book_activity) || {}
      const book = firstRel(ba.books) || {}
      const box = firstRel(book.box) || {}
      const lot = firstRel(box.lot) || {}

      // Determine the latest flag among warehouse, inventory, and endorsement
      const flagCandidates = [
        { at: uf.warehouse_flag_at, by: firstRel(uf.warehouse_user)?.name },
        { at: uf.inventory_flag_at, by: firstRel(uf.inventory_user)?.name },
        { at: uf.endorsement_flag_at, by: firstRel(uf.endorsement_user)?.name },
      ].filter(c => c.at)

      const latestFlag = flagCandidates.sort(
        (a, b) => new Date(b.at) - new Date(a.at)
      )[0]

      return {
        id: ba.id || uf.id,
        isbn: book.isbn || null,
        title: book.title || null,
        rejection_reason: uf.rejection_reason || null,
        scanned_at: latestFlag?.at || ba.warehouse_scan_at || null,
        scanned_by_name: latestFlag?.by || null,
        assigned_box: box.box_number
          ? { box_number: box.box_number, lot: lot.lot_number ? { lot_number: lot.lot_number } : null }
          : null
      }
    })

    // Filter to today's latest flag if requested
    if (today === 'true') {
      mappedRejectedBooks = mappedRejectedBooks.filter(item => {
        if (!item.scanned_at) return false
        const d = new Date(item.scanned_at)
        return d >= todayStart && d < tomorrowStart
      })
    }

    // Return only the most recent N
    mappedRejectedBooks = mappedRejectedBooks.slice(0, requestedLimit)

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
      book_id: existingScan.book_id,
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

    const { data, error } = await supabaseAdmin
      .from('book_activity')
      .update({ scan_status: 'non_processable', user_flag_id: flagData.id })
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
      book_id: existing.book_id,
      rejection_reason: remarks.trim(),
      notes: `Tagged as ${status} by ${taggedBy}`
    };
    if (stage === 'inventory') flagInsert.inventory_flag_by = req.user.id;
    else if (stage === 'qa' || stage === 'endorsement') flagInsert.endorsement_flag_by = req.user.id;
    else flagInsert.warehouse_flag_by = req.user.id;

    const { data: flagData, error: flagError } = await supabaseAdmin
      .from('user_flags')
      .insert(flagInsert)
      .select('id')
      .single();
    if (flagError) throw flagError;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('book_activity')
      .update({
        scan_status: status,
        user_flag_id: flagData.id
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
    console.error('Get warehouse scans by box error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
