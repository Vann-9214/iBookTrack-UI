import { db } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { broadcastEvent } from '../../utils/sse.js';
import { runWarehouseTimeoutSweep } from '../../utils/warehouseTimeout.js';

// ── Warehouse session locking helpers ────────────────────────────────────────
// A box is "locked" while it has an active warehouse session ('in_progress' or
// 'delayed'). Only the user who owns the lock may resume/complete it; everyone
// else is blocked until the session completes or is deleted.

const getActiveWarehouseSession = async (boxId) => {
  const { rows } = await db.query(`
    SELECT bs.*, u.name AS user_name
    FROM box_sessions bs
    LEFT JOIN users u ON u.id = bs.warehouse_user_received
    WHERE bs.box_id = $1
      AND bs.warehouse_user_received IS NOT NULL
      AND bs.status IN ('in_progress', 'delayed')
    ORDER BY bs.warehouse_time_received DESC NULLS LAST
    LIMIT 1
  `, [boxId]);
  return rows[0] || null;
};

const getBoxLockPayload = async (boxId) => {
  const { rows } = await db.query(`
    SELECT bx.id AS box_id, bx.box_number, bx.box_type, l.lot_number
    FROM boxes bx
    LEFT JOIN lots l ON l.id = bx.lot_id
    WHERE bx.id = $1 LIMIT 1
  `, [boxId]);
  return rows[0] || { box_id: boxId, box_number: null, box_type: null, lot_number: null };
};

export const startSessionService = async (req, res) => {
  try {
    // Mark any in_progress sessions older than 30 min as delayed before lock checks
    await runWarehouseTimeoutSweep();

    const { lot_number, box_id, box_number: requestedBoxNumber } = req.body

    if (!lot_number) {
      return res.status(400).json({ error: 'lot_number is required' })
    }

    const bookType = req.body.type ? req.body.type.charAt(0).toUpperCase() + req.body.type.slice(1).toLowerCase() : 'Mustang';

    // Get or create the lot (type-aware, matching bulk-save/box-exists resolution)
    let lotQuery = 'SELECT * FROM lots WHERE lot_number = $1 AND type = $2';
    const lotParams = [lot_number, bookType];
    let { rows: lotRows } = await db.query(lotQuery + ' LIMIT 1', lotParams);
    let lot = lotRows[0] || null;

    if (!lot) {
      const { rows: newLotRows } = await db.query(
        'INSERT INTO lots (lot_number, total_boxes, type, created_by) VALUES ($1, 0, $2, $3) RETURNING *',
        [lot_number, bookType, req.user.id]
      );
      lot = newLotRows[0];
    }

    let assignedBoxId = null
    if (box_id) {
      const { rows: boxRows } = await db.query('SELECT id, lot_id FROM boxes WHERE id = $1 LIMIT 1', [box_id]);
      const selectedBox = boxRows[0] || null;
      if (selectedBox && selectedBox.lot_id === lot.id) {
        assignedBoxId = selectedBox.id
      }
    }

    if (!assignedBoxId && requestedBoxNumber) {
      const boxName = requestedBoxNumber
      let boxQuery = 'SELECT id, total_expected_books, current_stage FROM boxes WHERE lot_id = $1 AND box_number = $2';
      const boxParams = [lot.id, boxName];
      if (bookType) { boxQuery += ' AND box_type = $3'; boxParams.push(bookType); }
      else { boxQuery += ' AND box_type IS NULL'; }
      const { rows: existingBoxRows } = await db.query(boxQuery + ' LIMIT 1', boxParams);
      const existingBox = existingBoxRows[0] || null;

      if (existingBox) {
        // Pessimistic lock check happens below (after assignedBoxId is set) so
        // the owner of an active session can always resume it, even if the
        // box would normally trigger a duplicate-box conflict.
        const activeSession = await getActiveWarehouseSession(existingBox.id);
        if (!activeSession && !req.body.force) {
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
        const { rows: newBoxRows } = await db.query(
          'INSERT INTO boxes (box_number, lot_id, box_type, current_stage, total_expected_books) VALUES ($1, $2, $3, $4, 0) RETURNING *',
          [boxName, lot.id, bookType, 'warehouse']
        );
        assignedBoxId = newBoxRows[0].id;
      }
    }

    if (!assignedBoxId) {
      return res.status(400).json({ error: 'A valid box is required to start a session.' })
    }

    // ── The Lock: block if another user is actively processing this box ──────
    const activeSession = await getActiveWarehouseSession(assignedBoxId);
    if (activeSession && activeSession.warehouse_user_received !== req.user.id) {
      return res.status(403).json({
        error: 'BoxInProcess',
        message: `Box is currently in process by ${activeSession.user_name || 'another user'}.`,
        locked_by: { user_id: activeSession.warehouse_user_received, user_name: activeSession.user_name || null }
      })
    }

    let session;
    if (activeSession) {
      // Same user: resume their existing session (refreshes updated_at so the
      // 20-minute timeout counter restarts and clears any 'delayed' state).
      const { rows: resumedRows } = await db.query(
        "UPDATE box_sessions SET status = 'in_progress' WHERE id = $1 RETURNING *",
        [activeSession.id]
      );
      session = resumedRows[0];
    } else {
      const { rows: sessionRows } = await db.query(
        "INSERT INTO box_sessions (box_id, warehouse_user_received, warehouse_time_received, status) VALUES ($1, $2, NOW(), 'in_progress') RETURNING *",
        [assignedBoxId, req.user.id]
      );
      session = sessionRows[0];
    }

    const lockPayload = await getBoxLockPayload(assignedBoxId);
    const { rows: userRows } = await db.query('SELECT name FROM users WHERE id = $1 LIMIT 1', [req.user.id]);
    broadcastEvent('WAREHOUSE_LOCKED', {
      ...lockPayload,
      user_id: req.user.id,
      user_name: userRows[0]?.name || null,
      status: 'in_progress'
    });

    res.status(201).json({ 
      session,
      lot_id: lot.id,
      lot_number: lot.lot_number,
      message: activeSession ? 'Existing session resumed.' : 'Session started with selected box.'
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

    if (book_type) book_type = book_type.charAt(0).toUpperCase() + book_type.slice(1).toLowerCase();

    const { rows: sessionRows } = await db.query('SELECT * FROM box_sessions WHERE id = $1 LIMIT 1', [session_id]);
    const session = sessionRows[0];
    if (!session) throw new Error('Session not found');

    let currentBrand = book_type;
    if (!currentBrand && session.box_id) {
      const { rows: brandRows } = await db.query(
        'SELECT bx.box_type, l.type as lot_type FROM boxes bx JOIN lots l ON bx.lot_id = l.id WHERE bx.id = $1 LIMIT 1', 
        [session.box_id]
      );
      if (brandRows.length > 0) {
        let bt = brandRows[0].box_type;
        let lt = brandRows[0].lot_type;
        currentBrand = (bt && bt.toLowerCase() !== 'mixed') ? bt : lt;
      }
    }

    if (issues && issues.length > 0) {
      const missingIsbns = new Set();
      for (const issue of issues) {
        if (issue.type === 'missing') {
          if (missingIsbns.has(issue.isbn)) {
            return res.status(400).json({ error: `Duplicate Missing Book in request: ISBN ${issue.isbn} is listed multiple times.` });
          }
          missingIsbns.add(issue.isbn);

          let query = 'SELECT b.id, bx.box_number, l.lot_number FROM books b LEFT JOIN boxes bx ON b.box_id = bx.id LEFT JOIN lots l ON bx.lot_id = l.id WHERE b.isbn = $1 AND b.is_nonprocessable = true';
          let params = [issue.isbn];
          if (currentBrand) {
            query += ' AND (LOWER(b.book_type) = LOWER($2) OR LOWER(bx.box_type) = LOWER($2) OR LOWER(l.type) = LOWER($2))';
            params.push(currentBrand);
          }
          const { rows: dupRows } = await db.query(query + ' LIMIT 1', params);
          if (dupRows.length > 0) {
            const dup = dupRows[0];
            return res.status(400).json({ error: `Duplicate Missing Book: ISBN ${issue.isbn} is already marked as missing in Lot ${dup.lot_number || 'Unknown'}, Box ${dup.box_number || 'Unknown'}.` });
          }
        }
      }
    }

    if (session.box_id) {
      if (stage === 'inventory') {
        const { rows: booksInBox } = await db.query('SELECT id FROM books WHERE box_id = $1', [session.box_id]);
        if (booksInBox.length > 0) {
          const ph = booksInBox.map((_, i) => `$${i + 2}`).join(',');
          await db.query(`UPDATE book_activity SET inventory_scan_by = $1, inventory_scan_at = NOW() WHERE book_id IN (${ph}) AND inventory_scan_at IS NULL`, [req.user.id, ...booksInBox.map(b => b.id)]);
        }
      } else if (stage === 'qa' || stage === 'endorsement') {
        const { rows: booksInBox } = await db.query('SELECT id FROM books WHERE box_id = $1', [session.box_id]);
        if (booksInBox.length > 0) {
          const ph = booksInBox.map((_, i) => `$${i + 2}`).join(',');
          await db.query(`UPDATE book_activity SET endorsement_scan_by = $1, endorsement_scan_at = NOW() WHERE book_id IN (${ph}) AND endorsement_scan_at IS NULL`, [req.user.id, ...booksInBox.map(b => b.id)]);
        }
      }
      
      if (total_expected_books) {
        await db.query('UPDATE boxes SET total_expected_books = $1 WHERE id = $2', [parseInt(total_expected_books), session.box_id]);
      }
    }

    if (issues && issues.length > 0) {
      const scannedBy = req.user.id
      for (const issue of issues) {
        let { rows: existingBookRows } = await db.query('SELECT id FROM books WHERE isbn = $1 AND box_id = $2 LIMIT 1', [issue.isbn, session.box_id]);
        let bookId = existingBookRows[0]?.id;

        if (!bookId) {
          const { rows: newBookRows } = await db.query(
            'INSERT INTO books (isbn, title, author, box_id, book_type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [issue.isbn, issue.title || 'Unknown Title', issue.author || null, session.box_id, book_type || null]
          );
          bookId = newBookRows[0].id;
        }

        if (bookId) {
          const { rows: resFlags } = await db.query('SELECT 1 FROM user_flags uf JOIN book_activity ba ON uf.book_activity_id = ba.id WHERE ba.book_id = $1 AND uf.is_resolved = true LIMIT 1', [bookId]);
          if (resFlags.length > 0) return res.status(400).json({ error: `ISBN ${issue.isbn} has a resolved flag and cannot be flagged again.` });

          await db.query(`UPDATE books SET is_nonprocessable = true WHERE id = $1`, [bookId]);

          const { rows: actRows } = await db.query(
            'INSERT INTO book_activity (book_id, session_id, scan_status, warehouse_scan_at, warehouse_scan_by) VALUES ($1, $2, $3, NOW(), $4) RETURNING id',
            [bookId, session.id, 'non_processable', scannedBy]
          );
          
          if (actRows[0]) {
            const flagInsert = { book_activity_id: actRows[0].id, rejection_reason: issue.type, notes: `Marked as missing during session completion` };
            if (stage === 'inventory') { flagInsert.inventory_flag_by = scannedBy; flagInsert.inventory_flag_at = new Date().toISOString(); }
            else if (stage === 'qa' || stage === 'endorsement') { flagInsert.endorsement_flag_by = scannedBy; flagInsert.endorsement_flag_at = new Date().toISOString(); }
            else if (stage === 'scan') { flagInsert.scan_flag_by = scannedBy; flagInsert.scan_flag_at = new Date().toISOString(); }
            else { flagInsert.warehouse_flag_by = scannedBy; flagInsert.warehouse_flag_at = new Date().toISOString(); }

            const cols = Object.keys(flagInsert).join(', ');
            const ph = Object.keys(flagInsert).map((_, i) => `$${i + 1}`).join(', ');
            await db.query(`INSERT INTO user_flags (${cols}) VALUES (${ph})`, Object.values(flagInsert));
          }
        }
      }
    }

    let completeCol = null;
    if (stage === 'inventory') completeCol = 'inventory';
    else if (stage === 'qa' || stage === 'endorsement') completeCol = 'endorsement';

    let updQuery = `
      UPDATE box_sessions 
      SET status = 'completed',
          total_scanned_books = (SELECT COUNT(*) FROM book_activity ba WHERE ba.session_id = box_sessions.id),
          total_processable_books = (SELECT COUNT(*) FROM book_activity ba WHERE ba.session_id = box_sessions.id AND ba.scan_status = 'processable'),
          total_nonprocessable_books = (SELECT COUNT(*) FROM book_activity ba WHERE ba.session_id = box_sessions.id AND ba.scan_status = 'non_processable')
    `;
    let queryParams = [session_id];

    if (completeCol) {
      updQuery += `, ${completeCol}_complete_by = $2, ${completeCol}_complete_at = NOW() `;
      queryParams.push(req.user.id);
    }
    
    updQuery += ` WHERE id = $1 RETURNING *`;
    
    const { rows: updRows } = await db.query(updQuery, queryParams);

    if (session.box_id) {
      const lockPayload = await getBoxLockPayload(session.box_id);
      broadcastEvent('WAREHOUSE_UNLOCKED', lockPayload);
      broadcastEvent('INVENTORY_UNLOCKED', lockPayload);
      broadcastEvent('ENDORSEMENT_UNLOCKED', lockPayload);
      broadcastEvent('DASHBOARD_REFRESH', { source: 'session_complete' });
      broadcastEvent('PIPELINE_UPDATED', { source: 'session_complete' });
    }

    res.json({ session: updRows[0] })
  } catch (error) {
    logger.error('Complete session error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const bulkSaveSessionService = async (req, res) => {
  try {
    let { lot_number, box_number, type, force, total_expected_books, issues, scanned_books, book_type, session_id } = req.body;
    if (book_type) book_type = book_type.charAt(0).toUpperCase() + book_type.slice(1).toLowerCase();

    // 1. Resolve Lot
    if (!book_type) book_type = 'Mustang';

    if (issues && issues.length > 0) {
      const missingIsbns = new Set();
      for (const issue of issues) {
        if (issue.type === 'missing') {
          if (missingIsbns.has(issue.isbn)) {
            return res.status(400).json({ error: `Duplicate Missing Book in request: ISBN ${issue.isbn} is listed multiple times.` });
          }
          missingIsbns.add(issue.isbn);

          let query = 'SELECT b.id, bx.box_number, l.lot_number FROM books b LEFT JOIN boxes bx ON b.box_id = bx.id LEFT JOIN lots l ON bx.lot_id = l.id WHERE b.isbn = $1 AND b.is_nonprocessable = true';
          let params = [issue.isbn];
          if (book_type) {
            query += ' AND (LOWER(b.book_type) = LOWER($2) OR LOWER(bx.box_type) = LOWER($2) OR LOWER(l.type) = LOWER($2))';
            params.push(book_type);
          }
          const { rows: dupRows } = await db.query(query + ' LIMIT 1', params);
          if (dupRows.length > 0) {
            const dup = dupRows[0];
            return res.status(400).json({ error: `Duplicate Missing Book: ISBN ${issue.isbn} is already marked as missing in Lot ${dup.lot_number || 'Unknown'}, Box ${dup.box_number || 'Unknown'}.` });
          }
        }
      }
    }
    let lotQuery = 'SELECT id, lot_number FROM lots WHERE lot_number = $1 AND type = $2';
    const lotParams = [lot_number, book_type];
    
    let { rows: lotRows } = await db.query(lotQuery + ' LIMIT 1', lotParams);
    let lot = lotRows[0] || null;

    if (!lot) {
      const { rows: newLotRows } = await db.query(
        'INSERT INTO lots (lot_number, type, total_boxes, created_by) VALUES ($1, $2, 0, $3) RETURNING *',
        [lot_number, book_type, req.user.id]
      );
      lot = newLotRows[0];
    }

    // 2. Resolve Box
    if (!box_number) return res.status(400).json({ error: 'box_number is required' });
    let assignedBoxId = null;
    let existingBox = null;
    
    let boxQ = 'SELECT id, total_expected_books, current_stage FROM boxes WHERE lot_id = $1 AND box_number = $2';
    const boxP = [lot.id, box_number];
    if (book_type) { boxQ += ' AND box_type = $3'; boxP.push(book_type); }
    else { boxQ += ' AND box_type IS NULL'; }

    const { rows: boxRows } = await db.query(boxQ + ' LIMIT 1', boxP);
    if (boxRows[0]) {
      // The Lock: block completion if another user holds an active session on this box
      const activeSession = await getActiveWarehouseSession(boxRows[0].id);
      if (activeSession && activeSession.warehouse_user_received !== req.user.id) {
        return res.status(403).json({
          error: 'BoxInProcess',
          message: `Box is currently in process by ${activeSession.user_name || 'another user'}.`,
          locked_by: { user_id: activeSession.warehouse_user_received, user_name: activeSession.user_name || null }
        });
      }
      if (!activeSession && boxRows[0].total_expected_books > 0) {
        return res.status(409).json({ error: `Box ${box_number} already exists in ${lot_number}. Please use a different box number.` });
      }
      assignedBoxId = boxRows[0].id;
      existingBox = boxRows[0];
    } else {
      const { rows: newBoxRows } = await db.query(
        "INSERT INTO boxes (box_number, lot_id, box_type, current_stage, total_expected_books) VALUES ($1, $2, $3, 'warehouse', $4) RETURNING *",
        [box_number, lot.id, book_type || null, parseInt(total_expected_books) || 0]
      );
      assignedBoxId = newBoxRows[0].id;
      existingBox = newBoxRows[0];
    }

    // 3. Create (or complete) the Session
    // If the frontend passes the session_id created at session start, transition
    // that locking session to 'completed' instead of inserting a duplicate.
    let session = null;
    if (session_id) {
      const { rows: lockSessRows } = await db.query(
        "UPDATE box_sessions SET status = 'completed' WHERE id = $1 AND box_id = $2 RETURNING *",
        [session_id, assignedBoxId]
      );
      session = lockSessRows[0] || null;
    }
    if (!session) {
      const { rows: sessRows } = await db.query(`
        INSERT INTO box_sessions (box_id, warehouse_user_received, warehouse_time_received, status, total_scanned_books, total_processable_books, total_nonprocessable_books)
        VALUES ($1, $2, NOW(), 'completed', 0, 0, 0) RETURNING *
      `, [assignedBoxId, req.user.id]);
      session = sessRows[0];
    }

    // 4. Save scanned books
    for (const b of (scanned_books || [])) {
      let bQ = 'SELECT id FROM books WHERE isbn = $1 AND box_id = $2';
      const bP = [b.isbn, assignedBoxId];
      if (book_type) { bQ += ' AND book_type = $3'; bP.push(book_type); }
      else { bQ += ' AND book_type IS NULL'; }
      let { rows: bRows } = await db.query(bQ + ' LIMIT 1', bP);
      let bookId = bRows[0]?.id;
      
      if (!bookId) {
        const { rows: nbRows } = await db.query(
          'INSERT INTO books (isbn, title, author, box_id, book_type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [b.isbn, b.title || 'Unknown Title', b.author || null, assignedBoxId, book_type || null]
        );
        bookId = nbRows[0].id;
      }

      const { rows: actRows } = await db.query(
        'INSERT INTO book_activity (book_id, session_id, scan_status, warehouse_scan_at, warehouse_scan_by) VALUES ($1, $2, $3, NOW(), $4) RETURNING id',
        [bookId, session.id, b.scan_status, req.user.id]
      );

      if (b.flag_issue || b.flag_remarks) {
        const { rows: resFlags } = await db.query('SELECT 1 FROM user_flags uf JOIN book_activity ba ON uf.book_activity_id = ba.id WHERE ba.book_id = $1 AND uf.is_resolved = true LIMIT 1', [bookId]);
        if (resFlags.length > 0) return res.status(400).json({ error: `ISBN ${b.isbn} has a resolved flag and cannot be flagged again.` });

        await db.query(
          'INSERT INTO user_flags (book_activity_id, rejection_reason, notes, warehouse_flag_by, warehouse_flag_at) VALUES ($1, $2, $3, $4, NOW())',
          [actRows[0].id, b.flag_issue || null, b.flag_remarks || null, req.user.id]
        );
        if (b.flag_issue !== 'mismatched-book') {
          await db.query('UPDATE books SET is_nonprocessable = true WHERE id = $1', [bookId]);
        }
        if (b.flag_issue === 'mismatched-book') {
          if (b.mismatch_details && b.mismatch_details.ilms_title && b.mismatch_details.physical_title) {
            await db.query(`
              INSERT INTO mismatch_info (book_id, ilms_title, ilms_author, physical_title, physical_author, created_by)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [bookId, b.mismatch_details.ilms_title, b.mismatch_details.ilms_author || null, b.mismatch_details.physical_title, b.mismatch_details.physical_author || null, req.user.id]);
          }
        }
      }
    }

    // 5. Process issues
    if (issues && issues.length > 0) {
      for (const issue of issues) {
        let isQ = 'SELECT id FROM books WHERE isbn = $1 AND box_id = $2';
        const isP = [issue.isbn, assignedBoxId];
        if (book_type) { isQ += ' AND book_type = $3'; isP.push(book_type); }
        else { isQ += ' AND book_type IS NULL'; }
        let { rows: globalBookRows } = await db.query(isQ + ' LIMIT 1', isP);
        let bookId = globalBookRows[0]?.id;
        
        if (!bookId) {
           const { rows: nbRows } = await db.query(
             'INSERT INTO books (isbn, title, author, box_id, book_type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
             [issue.isbn, issue.title || 'Unknown', issue.author || null, assignedBoxId, book_type || null]
           );
           bookId = nbRows[0].id;
        }

        const { rows: resFlags } = await db.query('SELECT 1 FROM user_flags uf JOIN book_activity ba ON uf.book_activity_id = ba.id WHERE ba.book_id = $1 AND uf.is_resolved = true LIMIT 1', [bookId]);
        if (resFlags.length > 0) return res.status(400).json({ error: `ISBN ${issue.isbn} has a resolved flag and cannot be flagged again.` });

        await db.query(`UPDATE books SET is_nonprocessable = true WHERE id = $1`, [bookId]);

        const { rows: actRows } = await db.query(
          "INSERT INTO book_activity (book_id, session_id, scan_status, warehouse_scan_at, warehouse_scan_by) VALUES ($1, $2, 'non_processable', NOW(), $3) RETURNING id",
          [bookId, session.id, req.user.id]
        );
        await db.query(
          'INSERT INTO user_flags (book_activity_id, rejection_reason, notes, warehouse_flag_by, warehouse_flag_at) VALUES ($1, $2, $3, $4, NOW())',
          [actRows[0].id, issue.type, 'Marked as missing during session bulk-complete', req.user.id]
        );
      }
    }

    if (total_expected_books && existingBox) {
      await db.query('UPDATE boxes SET total_expected_books = $1 WHERE id = $2', [parseInt(total_expected_books), assignedBoxId]);
    }

    const { rows: finalSessRows } = await db.query(`
      UPDATE box_sessions 
      SET total_scanned_books = (SELECT COUNT(*) FROM book_activity ba WHERE ba.session_id = box_sessions.id),
          total_processable_books = (SELECT COUNT(*) FROM book_activity ba WHERE ba.session_id = box_sessions.id AND ba.scan_status = 'processable'),
          total_nonprocessable_books = (SELECT COUNT(*) FROM book_activity ba WHERE ba.session_id = box_sessions.id AND ba.scan_status = 'non_processable')
      WHERE id = $1 
      RETURNING *
    `, [session.id]);
    session = finalSessRows[0];

    const lockPayload = await getBoxLockPayload(assignedBoxId);
    broadcastEvent('WAREHOUSE_UNLOCKED', lockPayload);
    broadcastEvent('INVENTORY_UNLOCKED', lockPayload);
    broadcastEvent('ENDORSEMENT_UNLOCKED', lockPayload);
    broadcastEvent('DASHBOARD_REFRESH', { source: 'warehouse_bulk_save' });

    res.status(201).json({ success: true, session });
  } catch (error) {
    logger.error('Bulk save error:', error);
    res.status(500).json({ error: error.message });
  }
}

export const resumeSessionService = async (req, res) => {
  try {
    const { box_id } = req.params;
    
    // determine stage
    const { rows: boxRows } = await db.query('SELECT lot_id, current_stage, box_number, box_type, total_mismatch_books FROM boxes WHERE id = $1', [box_id]);
    if (!boxRows[0]) throw new Error('Box not found');
    const box = boxRows[0];

    // Removed block for unresolved mismatched books at user's request

    const { rows: sessionRows } = await db.query('SELECT * FROM box_sessions WHERE box_id = $1 ORDER BY warehouse_time_received DESC LIMIT 1', [box_id]);
    const session = sessionRows[0];

    if (box.current_stage === 'inventory') {
      if (session && ['in_progress', 'delayed'].includes(session.status) && session.inventory_session_started_by !== req.user.id && session.inventory_session_started_by !== null) {
        const { rows: userRows } = await db.query('SELECT name FROM users WHERE id = $1', [session.inventory_session_started_by]);
        return res.status(403).json({
          error: 'BoxInProcess',
          message: `Box is currently in process by ${userRows[0]?.name || 'another user'}.`,
        });
      }

      let updatedSession;
      if (session) {
        const { rows: updSess } = await db.query(
          "UPDATE box_sessions SET status = 'in_progress', inventory_session_started_by = $2, inventory_session_started_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *",
          [session.id, req.user.id]
        );
        updatedSession = updSess[0];
      } else {
        const { rows: newSess } = await db.query(
          "INSERT INTO box_sessions (box_id, inventory_user_received, inventory_time_received, status) VALUES ($1, $2, NOW(), 'in_progress') RETURNING *",
          [box_id, req.user.id]
        );
        updatedSession = newSess[0];
      }

      const { rows: userRows } = await db.query('SELECT name FROM users WHERE id = $1 LIMIT 1', [req.user.id]);
      const { rows: lotRows } = await db.query('SELECT lot_number FROM lots WHERE id = $1 LIMIT 1', [box.lot_id]);
      broadcastEvent('INVENTORY_LOCKED', {
        box_id,
        box_number: box.box_number,
        box_type: box.box_type,
        lot_number: lotRows[0]?.lot_number || null,
        user_id: req.user.id,
        user_name: userRows[0]?.name || null,
        status: 'in_progress'
      });
      return res.json({ session: updatedSession });
    }

    if (box.current_stage === 'endorsement' || box.current_stage === 'qa') {
      if (session && ['in_progress', 'delayed'].includes(session.status) && session.endorsement_session_started_by !== req.user.id && session.endorsement_session_started_by !== null) {
        const { rows: userRows } = await db.query('SELECT name FROM users WHERE id = $1', [session.endorsement_session_started_by]);
        return res.status(403).json({
          error: 'BoxInProcess',
          message: `Box is currently in process by ${userRows[0]?.name || 'another user'}.`,
        });
      }

      let updatedSession;
      if (session) {
        const { rows: updSess } = await db.query(
          "UPDATE box_sessions SET status = 'in_progress', endorsement_session_started_by = $2, endorsement_session_started_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *",
          [session.id, req.user.id]
        );
        updatedSession = updSess[0];
      } else {
        const { rows: newSess } = await db.query(
          "INSERT INTO box_sessions (box_id, endorsement_user_received, endorsement_time_received, status) VALUES ($1, $2, NOW(), 'in_progress') RETURNING *",
          [box_id, req.user.id]
        );
        updatedSession = newSess[0];
      }

      const { rows: userRows } = await db.query('SELECT name FROM users WHERE id = $1 LIMIT 1', [req.user.id]);
      const { rows: lotRows } = await db.query('SELECT lot_number FROM lots WHERE id = $1 LIMIT 1', [box.lot_id]);
      broadcastEvent('ENDORSEMENT_LOCKED', {
        box_id,
        box_number: box.box_number,
        box_type: box.box_type,
        lot_number: lotRows[0]?.lot_number || null,
        user_id: req.user.id,
        user_name: userRows[0]?.name || null,
        status: 'in_progress'
      });
      broadcastEvent('DASHBOARD_REFRESH', { source: 'endorsement_start' });
      return res.json({ session: updatedSession });
    }

    if (!session) {
      const { rows: newSess } = await db.query(
        "INSERT INTO box_sessions (box_id, inventory_user_received, inventory_time_received, status) VALUES ($1, $2, NOW(), 'received') RETURNING *",
        [box_id, req.user.id]
      );
      return res.json({ session: newSess[0] });
    }
    res.json({ session })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const cancelSessionService = async (req, res) => {
  try {
    const { box_id } = req.params
    const { rows: sessionRows } = await db.query('SELECT id FROM box_sessions WHERE box_id = $1 ORDER BY COALESCE(warehouse_time_received, inventory_time_received, cut_time_received, endorsement_time_received, scan_time_received) DESC NULLS LAST LIMIT 1', [box_id]);
    
    if (!sessionRows[0]) return res.json({ success: true, message: 'No session to cancel' });

    const { rows: updSess } = await db.query("UPDATE box_sessions SET status = 'received', inventory_session_started_by = NULL, endorsement_session_started_by = NULL WHERE id = $1 RETURNING *", [sessionRows[0].id]);
    const lockPayload = await getBoxLockPayload(box_id);
    broadcastEvent('WAREHOUSE_UNLOCKED', lockPayload);
    broadcastEvent('INVENTORY_UNLOCKED', lockPayload);
    broadcastEvent('ENDORSEMENT_UNLOCKED', lockPayload);
    broadcastEvent('DASHBOARD_REFRESH', { source: 'warehouse_cancel' });

    res.json({ session: updSess[0] })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const deleteSessionService = async (req, res) => {
  try {
    const { session_id } = req.params
    const { rows: sessionRows } = await db.query(`
      SELECT bs.box_id, bs.warehouse_user_received, bs.inventory_session_started_by, bs.endorsement_session_started_by, bx.current_stage
      FROM box_sessions bs
      LEFT JOIN boxes bx ON bs.box_id = bx.id
      WHERE bs.id = $1 LIMIT 1
    `, [session_id]);
    
    if (sessionRows[0]) {
      // Non-supervisors may only delete/reset their own sessions
      const sessionOwner = sessionRows[0].warehouse_user_received || sessionRows[0].inventory_session_started_by || sessionRows[0].endorsement_session_started_by;
      if (req.user.role !== 'supervisor' && sessionOwner !== req.user.id) {
        return res.status(403).json({ error: 'You can only cancel your own sessions.' })
      }

      const boxId = sessionRows[0].box_id;
      const currentStage = sessionRows[0].current_stage;
      let lockPayload = null;
      if (boxId) lockPayload = await getBoxLockPayload(boxId);

      if (currentStage === 'inventory' || currentStage === 'endorsement' || currentStage === 'qa') {
        // Just cancel the active part of the session to revert it back to the original receiver
        await db.query(`
          UPDATE box_sessions 
          SET status = 'received', 
              inventory_session_started_by = NULL, 
              endorsement_session_started_by = NULL 
          WHERE id = $1
        `, [session_id]);
        
        broadcastEvent('WAREHOUSE_UNLOCKED', lockPayload);
        broadcastEvent('INVENTORY_UNLOCKED', lockPayload);
        broadcastEvent('ENDORSEMENT_UNLOCKED', lockPayload);
        broadcastEvent('DASHBOARD_REFRESH', { source: 'warehouse_delete' });
      } else {
        await db.query('DELETE FROM box_sessions WHERE id = $1', [session_id]);
        if (boxId) {
          // Safety rollback: only remove the box if it's still empty — no expected
          // count set and no books attached — so real boxes are never deleted.
          await db.query(`
            DELETE FROM boxes b
            WHERE b.id = $1
              AND b.total_expected_books = 0
              AND NOT EXISTS (SELECT 1 FROM books WHERE box_id = b.id)
          `, [boxId]);
          broadcastEvent('WAREHOUSE_UNLOCKED', lockPayload);
          broadcastEvent('INVENTORY_UNLOCKED', lockPayload);
          broadcastEvent('ENDORSEMENT_UNLOCKED', lockPayload);
          broadcastEvent('DASHBOARD_REFRESH', { source: 'warehouse_delete' });
        }
      }
    }
    res.json({ success: true, message: 'Session cancelled' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const listSessionsService = async (req, res) => {
  try {
    const { status, limit = 20 } = req.query
    let query = `
      SELECT bs.*, bx.box_number, l.lot_number
      FROM box_sessions bs
      LEFT JOIN boxes bx ON bs.box_id = bx.id
      LEFT JOIN lots l ON bx.lot_id = l.id
    `;
    const params = [];
    if (status) {
      query += ` WHERE bs.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY bs.warehouse_time_received DESC LIMIT $${params.length + 1}`;
    params.push(Math.min(Math.max(parseInt(limit) || 20, 1), 50));

    const { rows } = await db.query(query, params);
    const data = rows.map(r => ({
      ...r,
      box: r.box_number ? { box_number: r.box_number, lot: { lot_number: r.lot_number } } : null
    }));

    res.json({ sessions: data })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
