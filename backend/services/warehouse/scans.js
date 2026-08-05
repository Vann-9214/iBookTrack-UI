import { db } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { broadcastEvent } from '../../utils/sse.js';


export const scanBookService = async (req, res) => {
  try {
    const { session_id } = req.params
    let { isbn, title: scannedTitle, author: scannedAuthor, scan_status, rejection_reason, notes, book_type, mismatch_details } = req.body

    if (book_type) book_type = book_type.charAt(0).toUpperCase() + book_type.slice(1).toLowerCase();
    if (!isbn) return res.status(400).json({ error: 'ISBN is required' })
    if (!scan_status) return res.status(400).json({ error: 'scan_status is required' })

    if (scan_status === 'non_processable' && (!notes || String(notes).trim() === '')) {
      return res.status(400).json({ error: 'Notes/remarks are required when flagging a book' });
    }

    const { rows: sessionRows } = await db.query('SELECT * FROM box_sessions WHERE id = $1 LIMIT 1', [session_id]);
    const session = sessionRows[0] || null;

    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (!session.box_id) return res.status(400).json({ error: 'Session does not have a box assigned' })

    const { rows: boxDetailsRows } = await db.query('SELECT lot_id, current_stage FROM boxes WHERE id = $1 LIMIT 1', [session.box_id]);
    const lotId = boxDetailsRows[0]?.lot_id;
    if (!lotId) return res.status(400).json({ error: 'Box does not have a lot assigned' })
    
    const { rows: lotRows } = await db.query('SELECT lot_number FROM lots WHERE id = $1 LIMIT 1', [lotId]);
    const lotNumber = lotRows[0]?.lot_number || 'UNKNOWN';

    const getNextBoxNumber = async (lId, bType, lNum) => {
      let q = 'SELECT box_number FROM boxes WHERE lot_id = $1';
      const p = [lId];
      if (bType) { q += ' AND box_type = $2'; p.push(bType); }
      else { q += ' AND box_type IS NULL'; }
      q += ' ORDER BY created_at DESC LIMIT 1';
      
      const { rows: existingBoxes } = await db.query(q, p);
      let nextNum = 1;
      if (existingBoxes[0]) {
        const match = existingBoxes[0].box_number.match(/(\d+)$/)
        if (match) nextNum = parseInt(match[1]) + 1
      }
      return `${lNum}-${bType ? bType.toUpperCase() + '-' : ''}${String(nextNum).padStart(4, '0')}`;
    }

    let assignedBoxId = session.box_id;
    let currentBox = boxDetailsRows[0];
    
    // Find existing book
    let bookId = null;
    let { rows: existingBookRows } = await db.query('SELECT id FROM books WHERE isbn = $1 AND box_id = $2 LIMIT 1', [isbn, assignedBoxId]);
    if (existingBookRows[0]) {
      bookId = existingBookRows[0].id;
      if (scannedAuthor) {
        await db.query('UPDATE books SET author = $1 WHERE id = $2 AND author IS NULL', [scannedAuthor, bookId]);
      }
    } else {
      const { rows: newBookRows } = await db.query(
        'INSERT INTO books (isbn, box_id, title, author, book_type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [isbn, assignedBoxId, scannedTitle || null, scannedAuthor || null, book_type || null]
      );
      bookId = newBookRows[0].id;
    }

    const stage = currentBox?.current_stage || 'warehouse';
    
    const actCols = ['session_id', 'book_id', 'scan_status'];
    const actVals = [session_id, bookId, scan_status];
    
    if (stage === 'inventory') { actCols.push('inventory_scan_by', 'inventory_scan_at'); actVals.push(req.user.id, new Date().toISOString()); }
    else if (stage === 'qa' || stage === 'endorsement') { actCols.push('endorsement_scan_by', 'endorsement_scan_at'); actVals.push(req.user.id, new Date().toISOString()); }
    else { actCols.push('warehouse_scan_by', 'warehouse_scan_at'); actVals.push(req.user.id, new Date().toISOString()); }

    let scanLog = null;
    const { rows: existingActRows } = await db.query('SELECT id, scan_status FROM book_activity WHERE session_id = $1 AND book_id = $2 LIMIT 1', [session_id, bookId]);
    if (existingActRows.length > 0) {
      const existing = existingActRows[0];
      const updateCols = [];
      const updateVals = [];
      let paramIdx = 1;
      
      if (stage === 'inventory') { updateCols.push(`inventory_scan_by = $${paramIdx++}`, `inventory_scan_at = $${paramIdx++}`); updateVals.push(req.user.id, new Date().toISOString()); }
      else if (stage === 'qa' || stage === 'endorsement') { updateCols.push(`endorsement_scan_by = $${paramIdx++}`, `endorsement_scan_at = $${paramIdx++}`); updateVals.push(req.user.id, new Date().toISOString()); }
      else { updateCols.push(`warehouse_scan_by = $${paramIdx++}`, `warehouse_scan_at = $${paramIdx++}`); updateVals.push(req.user.id, new Date().toISOString()); }
      
      updateCols.push(`scan_status = $${paramIdx++}`); updateVals.push(scan_status);
      
      updateVals.push(existing.id);
      
      const { rows: actRows } = await db.query(
        `UPDATE book_activity SET ${updateCols.join(', ')} WHERE id = $${paramIdx} RETURNING id, scan_status, warehouse_scan_by`,
        updateVals
      );
      scanLog = actRows[0];
      
      if (existing.scan_status === 'processable' && scan_status === 'non_processable') {
        await db.query('UPDATE box_sessions SET total_processable_books = GREATEST(0, total_processable_books - 1), total_nonprocessable_books = total_nonprocessable_books + 1 WHERE id = $1', [session_id]);
      } else if (existing.scan_status === 'non_processable' && scan_status === 'processable') {
        await db.query('UPDATE box_sessions SET total_processable_books = total_processable_books + 1, total_nonprocessable_books = GREATEST(0, total_nonprocessable_books - 1) WHERE id = $1', [session_id]);
      }
    } else {
      const { rows: actRows } = await db.query(
        `INSERT INTO book_activity (${actCols.join(',')}) VALUES (${actCols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id, scan_status, warehouse_scan_by`,
        actVals
      );
      scanLog = actRows[0];
    }

    if (rejection_reason || notes) {
      const flagInsert = { rejection_reason: rejection_reason || null, notes: notes || null };
      if (stage === 'inventory') { flagInsert.inventory_flag_by = req.user.id; flagInsert.inventory_flag_at = new Date().toISOString(); }
      else if (stage === 'qa' || stage === 'endorsement') { flagInsert.endorsement_flag_by = req.user.id; flagInsert.endorsement_flag_at = new Date().toISOString(); }
      else if (stage === 'scan') { flagInsert.scan_flag_by = req.user.id; flagInsert.scan_flag_at = new Date().toISOString(); }
      else { flagInsert.warehouse_flag_by = req.user.id; flagInsert.warehouse_flag_at = new Date().toISOString(); }

      const { rows: existingFlags } = await db.query('SELECT id FROM user_flags WHERE book_activity_id = $1 ORDER BY id ASC', [scanLog.id]);
      if (existingFlags.length > 0) {
        const flagId = existingFlags[0].id;
        if (existingFlags.length > 1) {
          await db.query('DELETE FROM user_flags WHERE book_activity_id = $1 AND id != $2', [scanLog.id, flagId]);
        }
        const updateCols = [];
        const updateVals = [];
        let pIdx = 1;
        for (const [k, v] of Object.entries(flagInsert)) {
          updateCols.push(`${k} = $${pIdx++}`);
          updateVals.push(v);
        }
        updateVals.push(flagId);
        await db.query(`UPDATE user_flags SET ${updateCols.join(', ')} WHERE id = $${pIdx}`, updateVals);
      } else {
        flagInsert.book_activity_id = scanLog.id;
        await db.query(
          `INSERT INTO user_flags (${Object.keys(flagInsert).join(',')}) VALUES (${Object.keys(flagInsert).map((_, i) => `$${i + 1}`).join(',')})`,
          Object.values(flagInsert)
        );
      }

      if (rejection_reason === 'extra-book') await db.query('UPDATE books SET is_extra = true WHERE id = $1', [bookId]);
      if (rejection_reason === 'mismatched-book') {
        await db.query('UPDATE books SET is_mismatch = true WHERE id = $1', [bookId]);
        if (mismatch_details && mismatch_details.ilms_title && mismatch_details.physical_title) {
          await db.query(`
            INSERT INTO mismatch_info (book_id, ilms_title, physical_title, physical_author, created_by)
            VALUES ($1, $2, $3, $4, $5)
          `, [bookId, mismatch_details.ilms_title, mismatch_details.physical_title, mismatch_details.physical_author || null, req.user.id]);
        }
      }
    }

    broadcastEvent('BOX_UPDATED', { boxId: assignedBoxId, type: 'scan', bookId });
    broadcastEvent('DASHBOARD_REFRESH', { source: 'warehouse_scan' });

    res.status(201).json({ scanLog, currentBox: { box_number: currentBox.box_number || null } })
  } catch (error) {
    logger.error('Scan book error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const flagScanService = async (req, res) => {
  try {
    const { scan_id } = req.params
    const { rejection_reason, notes, ilms_title, physical_title, physical_author } = req.body

    if (!rejection_reason) return res.status(400).json({ error: 'rejection_reason is required' })
    if (!notes || String(notes).trim() === '') return res.status(400).json({ error: 'Notes/remarks are required' })

    const { rows: scanRows } = await db.query('SELECT id, scan_status, session_id, book_id FROM book_activity WHERE id = $1 LIMIT 1', [scan_id]);
    const existingScan = scanRows[0];
    if (!existingScan) return res.status(404).json({ error: 'Scan not found' })

    const { rows: sessRows } = await db.query('SELECT box_id FROM box_sessions WHERE id = $1 LIMIT 1', [existingScan.session_id]);
    let stage = 'warehouse';
    if (sessRows[0]?.box_id) {
      const { rows: boxRows } = await db.query('SELECT current_stage FROM boxes WHERE id = $1 LIMIT 1', [sessRows[0].box_id]);
      if (boxRows[0]?.current_stage) stage = boxRows[0].current_stage;
    }

    const flagInsert = { rejection_reason, notes };
    if (stage === 'inventory') { flagInsert.inventory_flag_by = req.user.id; flagInsert.inventory_flag_at = new Date().toISOString(); }
    else if (stage === 'qa' || stage === 'endorsement') { flagInsert.endorsement_flag_by = req.user.id; flagInsert.endorsement_flag_at = new Date().toISOString(); }
    else if (stage === 'scan') { flagInsert.scan_flag_by = req.user.id; flagInsert.scan_flag_at = new Date().toISOString(); }
    else { flagInsert.warehouse_flag_by = req.user.id; flagInsert.warehouse_flag_at = new Date().toISOString(); }

    const { rows: existingFlags } = await db.query('SELECT id FROM user_flags WHERE book_activity_id = $1 ORDER BY id ASC', [existingScan.id]);
    if (existingFlags.length > 0) {
      const flagId = existingFlags[0].id;
      if (existingFlags.length > 1) {
        await db.query('DELETE FROM user_flags WHERE book_activity_id = $1 AND id != $2', [existingScan.id, flagId]);
      }
      const updateCols = [];
      const updateVals = [];
      let pIdx = 1;
      for (const [k, v] of Object.entries(flagInsert)) {
        updateCols.push(`${k} = $${pIdx++}`);
        updateVals.push(v);
      }
      updateVals.push(flagId);
      await db.query(`UPDATE user_flags SET ${updateCols.join(', ')} WHERE id = $${pIdx}`, updateVals);
    } else {
      flagInsert.book_activity_id = existingScan.id;
      await db.query(`INSERT INTO user_flags (${Object.keys(flagInsert).join(',')}) VALUES (${Object.keys(flagInsert).map((_, i) => `$${i + 1}`).join(',')})`, Object.values(flagInsert));
    }

    if (rejection_reason === 'extra-book') await db.query('UPDATE books SET is_extra = true WHERE id = $1', [existingScan.book_id]);
    if (rejection_reason === 'mismatched-book') {
      await db.query('UPDATE books SET is_mismatch = true WHERE id = $1', [existingScan.book_id]);
      if (ilms_title && physical_title) {
        await db.query(`
          INSERT INTO mismatch_info (book_id, ilms_title, physical_title, physical_author, created_by)
          VALUES ($1, $2, $3, $4, $5)
        `, [existingScan.book_id, ilms_title, physical_title, physical_author || null, req.user.id]);
      }
    }

    let finalStatus = 'non_processable';
    if (rejection_reason === 'mismatched-book') {
      finalStatus = existingScan.scan_status;
    }

    let updRows = [existingScan];
    if (finalStatus !== existingScan.scan_status || existingScan.scan_status === 'processable') {
      const { rows } = await db.query("UPDATE book_activity SET scan_status = $1 WHERE id = $2 RETURNING *", [finalStatus, scan_id]);
      updRows = rows;

      if (existingScan.scan_status === 'processable' && finalStatus === 'non_processable') {
        const { rows: bsRows } = await db.query('SELECT total_processable_books, total_nonprocessable_books FROM box_sessions WHERE id = $1', [existingScan.session_id]);
        if (bsRows[0]) {
          await db.query('UPDATE box_sessions SET total_processable_books = GREATEST(0, $1), total_nonprocessable_books = $2 WHERE id = $3', 
          [bsRows[0].total_processable_books - 1, bsRows[0].total_nonprocessable_books + 1, existingScan.session_id]);
        }
      }
    }

    broadcastEvent('FLAG_UPDATED', { scanId: scan_id, boxId: sessRows[0]?.box_id });
    broadcastEvent('DASHBOARD_REFRESH', { source: 'warehouse_flag' });

    res.json({ success: true, scan: updRows[0] })
  } catch (error) {
    logger.error('Flag scan error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const tagScanService = async (req, res) => {
  try {
    const { scan_id } = req.params
    const { status, remarks, rejection_reason, notes: reqNotes, stage: reqStage, ilms_title, physical_title, physical_author } = req.body

    const { rows: existingRows } = await db.query(`
      SELECT ba.id, ba.scan_status, ba.session_id, ba.book_id, b.isbn 
      FROM book_activity ba JOIN books b ON ba.book_id = b.id WHERE ba.id = $1 LIMIT 1
    `, [scan_id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Scan not found' })

    const taggedBy = req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email

    const { rows: sessRows } = await db.query('SELECT box_id FROM box_sessions WHERE id = $1 LIMIT 1', [existing.session_id]);
    let stage = reqStage || 'warehouse';
    if (!reqStage && sessRows[0]?.box_id) {
      const { rows: boxRows } = await db.query('SELECT current_stage FROM boxes WHERE id = $1 LIMIT 1', [sessRows[0].box_id]);
      if (boxRows[0]?.current_stage) stage = boxRows[0].current_stage;
    }

    const flagInsert = {
      book_activity_id: existing.id,
      rejection_reason: rejection_reason || (remarks ? remarks.trim() : null),
      notes: reqNotes || `Tagged as ${status} by ${taggedBy}`
    };
    if (stage === 'inventory') { flagInsert.inventory_flag_by = req.user.id; flagInsert.inventory_flag_at = new Date().toISOString(); }
    else if (stage === 'qa' || stage === 'endorsement') { flagInsert.endorsement_flag_by = req.user.id; flagInsert.endorsement_flag_at = new Date().toISOString(); }
    else if (stage === 'scan') { flagInsert.scan_flag_by = req.user.id; flagInsert.scan_flag_at = new Date().toISOString(); }
    else { flagInsert.warehouse_flag_by = req.user.id; flagInsert.warehouse_flag_at = new Date().toISOString(); }

    await db.query(`INSERT INTO user_flags (${Object.keys(flagInsert).join(',')}) VALUES (${Object.keys(flagInsert).map((_, i) => `$${i + 1}`).join(',')})`, Object.values(flagInsert));

    const actualReason = rejection_reason || (remarks ? remarks.trim() : '');
    if (actualReason === 'extra-book') await db.query('UPDATE books SET is_extra = true WHERE id = $1', [existing.book_id]);
    if (actualReason === 'mismatched-book') {
      await db.query('UPDATE books SET is_mismatch = true WHERE id = $1', [existing.book_id]);
      if (ilms_title && physical_title) {
        await db.query(`
          INSERT INTO mismatch_info (book_id, ilms_title, physical_title, physical_author, created_by)
          VALUES ($1, $2, $3, $4, $5)
        `, [existing.book_id, ilms_title, physical_title, physical_author || null, req.user.id]);
      }
    }

    const { rows: updatedRows } = await db.query('UPDATE book_activity SET scan_status = $1 WHERE id = $2 RETURNING *', [status, scan_id]);
    const updated = updatedRows[0];

    if (existing.scan_status === 'processable' && (status === 'non_processable' || status === 'reject')) {
      const { rows: bsRows } = await db.query('SELECT total_processable_books, total_nonprocessable_books FROM box_sessions WHERE id = $1', [existing.session_id]);
      if (bsRows[0]) {
        await db.query('UPDATE box_sessions SET total_processable_books = GREATEST(0, $1), total_nonprocessable_books = $2 WHERE id = $3', 
        [bsRows[0].total_processable_books - 1, bsRows[0].total_nonprocessable_books + 1, existing.session_id]);
      }
    }

    broadcastEvent('FLAG_UPDATED', { scanId: scan_id, boxId: sessRows[0]?.box_id });
    broadcastEvent('DASHBOARD_REFRESH', { source: 'warehouse_tag' });

    res.json({ success: true, scan: updated, message: `ISBN ${existing.isbn} tagged as ${status}` })
  } catch (error) {
    logger.error('Tag scan error:', error)
    res.status(500).json({ error: error.message })
  }
}

export const getBoxScansService = async (req, res) => {
  try {
    const { box_id } = req.params

    const { rows: scans } = await db.query(`
      SELECT ba.id, ba.scan_status, ba.warehouse_scan_at,
             uf.rejection_reason, uf.notes,
             b.isbn, b.title, b.author, bx.box_number, l.lot_number
      FROM book_activity ba
      LEFT JOIN user_flags uf ON uf.book_activity_id = ba.id
      JOIN books b ON ba.book_id = b.id
      JOIN boxes bx ON b.box_id = bx.id
      LEFT JOIN lots l ON bx.lot_id = l.id
      WHERE b.box_id = $1
      ORDER BY ba.warehouse_scan_at DESC
    `, [box_id]);

    const grouped = new Map();
    for (const scan of scans) {
      if (!grouped.has(scan.id)) {
        grouped.set(scan.id, {
          id: scan.id,
          isbn: scan.isbn,
          title: scan.title,
          author: scan.author,
          scan_status: scan.scan_status,
          rejection_reason: scan.rejection_reason || null,
          notes: scan.notes || null,
          warehouse_scan_at: scan.warehouse_scan_at
        });
      }
    }
    const warehouseBooks = Array.from(grouped.values());

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
