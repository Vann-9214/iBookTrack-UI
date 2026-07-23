import { db } from '../../config/db.js';
import { logger } from '../../utils/logger.js';


export const startSessionService = async (req, res) => {
  try {
    const { lot_number, box_id, box_number: requestedBoxNumber } = req.body

    if (!lot_number) {
      return res.status(400).json({ error: 'lot_number is required' })
    }

    // Get or create the lot
    let { rows: lotRows } = await db.query('SELECT * FROM lots WHERE lot_number = $1 LIMIT 1', [lot_number]);
    let lot = lotRows[0] || null;

    if (!lot) {
      const type = req.body.type ? req.body.type.charAt(0).toUpperCase() + req.body.type.slice(1).toLowerCase() : 'Mustang';
      const { rows: newLotRows } = await db.query(
        'INSERT INTO lots (lot_number, total_boxes, type) VALUES ($1, 0, $2) RETURNING *',
        [lot_number, type]
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
      const { rows: existingBoxRows } = await db.query('SELECT id, total_expected_books, current_stage FROM boxes WHERE lot_id = $1 AND box_number = $2 LIMIT 1', [lot.id, boxName]);
      const existingBox = existingBoxRows[0] || null;

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
        const { rows: newBoxRows } = await db.query(
          'INSERT INTO boxes (box_number, lot_id, box_type, current_stage, total_expected_books) VALUES ($1, $2, $3, $4, 0) RETURNING *',
          [boxName, lot.id, 'processable', 'warehouse']
        );
        assignedBoxId = newBoxRows[0].id;
      }
    }

    if (!assignedBoxId) {
      return res.status(400).json({ error: 'A valid box is required to start a session.' })
    }

    const { rows: sessionRows } = await db.query(
      'INSERT INTO box_sessions (box_id, warehouse_user_received, status) VALUES ($1, $2, $3) RETURNING *',
      [assignedBoxId, req.user.id, 'completed']
    );
    const session = sessionRows[0];

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

    if (book_type) book_type = book_type.charAt(0).toUpperCase() + book_type.slice(1).toLowerCase();

    const { rows: sessionRows } = await db.query('SELECT * FROM box_sessions WHERE id = $1 LIMIT 1', [session_id]);
    const session = sessionRows[0];
    if (!session) throw new Error('Session not found');

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
          let { rows: globalBookRows } = await db.query('SELECT id FROM books WHERE isbn = $1 LIMIT 1', [issue.isbn]);
          if (globalBookRows[0]) {
            bookId = globalBookRows[0].id;
          } else {
            const { rows: newBookRows } = await db.query(
              'INSERT INTO books (isbn, title, box_id, book_type) VALUES ($1, $2, $3, $4) RETURNING id',
              [issue.isbn, issue.title || 'Unknown Title', session.box_id, book_type || null]
            );
            bookId = newBookRows[0].id;
          }
        }

        if (bookId) {
          const updateCol = issue.type === 'missing' ? 'is_missing' : 'is_extra';
          await db.query(`UPDATE books SET ${updateCol} = true WHERE id = $1`, [bookId]);

          const { rows: actRows } = await db.query(
            'INSERT INTO book_activity (book_id, session_id, scan_status, warehouse_scan_at, warehouse_scan_by) VALUES ($1, $2, $3, NOW(), $4) RETURNING id',
            [bookId, session.id, 'non_processable', scannedBy]
          );
          
          if (actRows[0]) {
            const flagInsert = { book_activity_id: actRows[0].id, rejection_reason: issue.type, notes: `Marked as missing during session completion` };
            if (stage === 'inventory') flagInsert.inventory_flag_by = scannedBy;
            else if (stage === 'qa' || stage === 'endorsement') flagInsert.endorsement_flag_by = scannedBy;
            else flagInsert.warehouse_flag_by = scannedBy;

            const cols = Object.keys(flagInsert).join(', ');
            const ph = Object.keys(flagInsert).map((_, i) => `$${i + 1}`).join(', ');
            await db.query(`INSERT INTO user_flags (${cols}) VALUES (${ph})`, Object.values(flagInsert));
          }
        }
      }
    }

    const { rows: updRows } = await db.query("UPDATE box_sessions SET status = 'completed' WHERE id = $1 RETURNING *", [session_id]);
    res.json({ session: updRows[0] })
  } catch (error) {
    logger.error('Complete session error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const bulkSaveSessionService = async (req, res) => {
  try {
    let { lot_number, box_number, type, force, total_expected_books, issues, scanned_books, book_type } = req.body;
    if (book_type) book_type = book_type.charAt(0).toUpperCase() + book_type.slice(1).toLowerCase();

    // 1. Resolve Lot
    let lotQuery = 'SELECT id, lot_number FROM lots WHERE lot_number = $1';
    const lotParams = [lot_number];
    if (book_type) { lotQuery += ' AND type = $2'; lotParams.push(book_type); }
    else { lotQuery += ' AND type IS NULL'; }
    
    let { rows: lotRows } = await db.query(lotQuery + ' LIMIT 1', lotParams);
    let lot = lotRows[0] || null;

    if (!lot) {
      const { rows: newLotRows } = await db.query(
        'INSERT INTO lots (lot_number, type, total_boxes) VALUES ($1, $2, 0) RETURNING *',
        [lot_number, book_type || null]
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
      if (boxRows[0].total_expected_books > 0) {
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

    // 3. Create Session
    const { rows: sessRows } = await db.query(`
      INSERT INTO box_sessions (box_id, warehouse_user_received, warehouse_time_received, status, total_scanned_books, total_processable_books, total_nonprocessable_books)
      VALUES ($1, $2, NOW(), 'completed', 0, 0, 0) RETURNING *
    `, [assignedBoxId, req.user.id]);
    const session = sessRows[0];

    // 4. Save scanned books
    for (const b of (scanned_books || [])) {
      let bQ = 'SELECT id FROM books WHERE isbn = $1';
      const bP = [b.isbn];
      if (book_type) { bQ += ' AND book_type = $2'; bP.push(book_type); }
      else { bQ += ' AND book_type IS NULL'; }
      let { rows: bRows } = await db.query(bQ + ' LIMIT 1', bP);
      let bookId = bRows[0]?.id;
      
      if (!bookId) {
        const { rows: nbRows } = await db.query(
          'INSERT INTO books (isbn, title, box_id, book_type) VALUES ($1, $2, $3, $4) RETURNING id',
          [b.isbn, b.title || 'Unknown Title', assignedBoxId, book_type || null]
        );
        bookId = nbRows[0].id;
      }

      const { rows: actRows } = await db.query(
        'INSERT INTO book_activity (book_id, session_id, scan_status, warehouse_scan_at, warehouse_scan_by) VALUES ($1, $2, $3, NOW(), $4) RETURNING id',
        [bookId, session.id, b.scan_status, req.user.id]
      );

      if (b.flag_issue || b.flag_remarks) {
        await db.query(
          'INSERT INTO user_flags (book_activity_id, rejection_reason, notes, warehouse_flag_by) VALUES ($1, $2, $3, $4)',
          [actRows[0].id, b.flag_issue || null, b.flag_remarks || null, req.user.id]
        );
        if (b.flag_issue === 'extra-book') await db.query('UPDATE books SET is_extra = true WHERE id = $1', [bookId]);
        if (b.flag_issue === 'mismatched-book') await db.query('UPDATE books SET is_mismatch = true WHERE id = $1', [bookId]);
      }
    }

    // 5. Process issues
    if (issues && issues.length > 0) {
      for (const issue of issues) {
        let isQ = 'SELECT id FROM books WHERE isbn = $1';
        const isP = [issue.isbn];
        if (book_type) { isQ += ' AND book_type = $2'; isP.push(book_type); }
        else { isQ += ' AND book_type IS NULL'; }
        let { rows: globalBookRows } = await db.query(isQ + ' LIMIT 1', isP);
        let bookId = globalBookRows[0]?.id;
        
        if (!bookId) {
           const { rows: nbRows } = await db.query(
             'INSERT INTO books (isbn, title, box_id, book_type) VALUES ($1, $2, $3, $4) RETURNING id',
             [issue.isbn, issue.title || 'Unknown', assignedBoxId, book_type || null]
           );
           bookId = nbRows[0].id;
        }

        const upCol = issue.type === 'missing' ? 'is_missing' : 'is_extra';
        await db.query(`UPDATE books SET ${upCol} = true WHERE id = $1`, [bookId]);

        const { rows: actRows } = await db.query(
          "INSERT INTO book_activity (book_id, session_id, scan_status, warehouse_scan_at, warehouse_scan_by) VALUES ($1, $2, 'non_processable', NOW(), $3) RETURNING id",
          [bookId, session.id, req.user.id]
        );
        await db.query(
          'INSERT INTO user_flags (book_activity_id, rejection_reason, notes, warehouse_flag_by) VALUES ($1, $2, $3, $4)',
          [actRows[0].id, issue.type, 'Marked as missing during session bulk-complete', req.user.id]
        );
      }
    }

    if (total_expected_books && existingBox) {
      await db.query('UPDATE boxes SET total_expected_books = $1 WHERE id = $2', [parseInt(total_expected_books), assignedBoxId]);
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
    const { rows: sessionRows } = await db.query('SELECT * FROM box_sessions WHERE box_id = $1 ORDER BY warehouse_time_received DESC LIMIT 1', [box_id]);
    
    if (!sessionRows[0]) {
      const { rows: boxRows } = await db.query('SELECT lot_id FROM boxes WHERE id = $1', [box_id]);
      if (!boxRows[0]) throw new Error('Box not found');

      const { rows: newSess } = await db.query(
        "INSERT INTO box_sessions (box_id, inventory_user_received, inventory_time_received, status) VALUES ($1, $2, NOW(), 'received') RETURNING *",
        [box_id, req.user.id]
      );
      return res.json({ session: newSess[0] });
    }
    res.json({ session: sessionRows[0] })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const cancelSessionService = async (req, res) => {
  try {
    const { box_id } = req.params
    const { rows: sessionRows } = await db.query('SELECT id FROM box_sessions WHERE box_id = $1 ORDER BY warehouse_time_received DESC LIMIT 1', [box_id]);
    
    if (!sessionRows[0]) return res.json({ success: true, message: 'No session to cancel' });

    const { rows: updSess } = await db.query("UPDATE box_sessions SET status = 'received' WHERE id = $1 RETURNING *", [sessionRows[0].id]);
    res.json({ session: updSess[0] })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const deleteSessionService = async (req, res) => {
  try {
    const { session_id } = req.params
    const { rows: sessionRows } = await db.query('SELECT box_id FROM box_sessions WHERE id = $1 LIMIT 1', [session_id]);
    
    if (sessionRows[0]) {
      await db.query('DELETE FROM box_sessions WHERE id = $1', [session_id]);
      if (sessionRows[0].box_id) {
        await db.query('DELETE FROM boxes WHERE id = $1', [sessionRows[0].box_id]);
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
    params.push(Math.min(Math.max(parseInt(limit) || 20, 1), 100));

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
