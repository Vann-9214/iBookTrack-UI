/**
 * repositories/boxes.js
 *
 * Database access for boxes operations.
 * Uses vanilla PostgreSQL queries.
 */

import { db } from '../../config/db.js';

export const getBoxTypeById = async (id) => {
  try {
    const { rows } = await db.query('SELECT box_type FROM boxes WHERE id = $1 LIMIT 1', [id]);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBookActivityForSync = async (boxId) => {
  try {
    const query = `
      SELECT ba.book_id, b.isbn, b.box_id as "books.box_id"
      FROM book_activity ba
      INNER JOIN books b ON ba.book_id = b.id
      WHERE b.box_id = $1 AND ba.scan_status = 'processable'
    `;
    const { rows } = await db.query(query, [boxId]);
    const data = rows.map(r => ({
      book_id: r.book_id,
      books: { isbn: r.isbn, box_id: r['books.box_id'] }
    }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateTransmissionStatus = async (bookId, status, transmissionUpdatedAt = null) => {
  try {
    const { rows } = await db.query(
      `UPDATE book_activity
       SET transmission_status = $1,
           transmission_updated_at = $2
       WHERE book_id = $3
         AND (transmission_status IS DISTINCT FROM $1 OR transmission_updated_at IS DISTINCT FROM $2)
       RETURNING *`,
      [status, transmissionUpdatedAt, bookId]
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const searchBooksByIsbn = async (isbn) => {
  try {
    const { rows } = await db.query('SELECT box_id FROM books WHERE isbn ILIKE $1', [`%${isbn}%`]);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBoxesBaseQuery = async (lot_id, box_type, current_stage, box_number, isbnBoxIds) => {
  let query = `
    SELECT 
      b.*,
      json_build_object('lot_number', l.lot_number, 'type', l.type) as lot,
      (
        SELECT json_agg(json_build_object(
          'id', bs.id, 'status', bs.status, 'updated_at', bs.updated_at,
          'total_scanned_books', bs.total_scanned_books, 'total_processable_books', bs.total_processable_books,
          'warehouse_user_received', bs.warehouse_user_received,
          'inventory_user_received', bs.inventory_user_received,
          'endorsement_user_received', bs.endorsement_user_received,
          'inventory_user_send', bs.inventory_user_send,
          'warehouse_time_received', bs.warehouse_time_received,
          'inventory_time_received', bs.inventory_time_received,
          'inventory_time_send', bs.inventory_time_send,
          'inventory_complete_at', bs.inventory_complete_at,
          'cut_time_received', bs.cut_time_received,
          'cut_time_send', bs.cut_time_send,
          'endorsement_time_received', bs.endorsement_time_received,
          'endorsement_time_send', bs.endorsement_time_send,
          'endorsement_complete_at', bs.endorsement_complete_at,
          'scan_time_received', bs.scan_time_received,
          'inventory_session_started_at', bs.inventory_session_started_at,
          'endorsement_session_started_at', bs.endorsement_session_started_at,
          'inventory_printed_by', bs.inventory_printed_by,
          'inventory_printed_at', bs.inventory_printed_at,
          'warehouse_received_profile', (SELECT json_build_object('name', u1.name) FROM users u1 WHERE u1.id = bs.warehouse_user_received),
          'inventory_received_profile', (SELECT json_build_object('name', u2.name) FROM users u2 WHERE u2.id = bs.inventory_user_received),
          'inventory_started_profile', (SELECT json_build_object('name', us1.name) FROM users us1 WHERE us1.id = bs.inventory_session_started_by),
          'inventory_complete_profile', (SELECT json_build_object('name', uc1.name) FROM users uc1 WHERE uc1.id = bs.inventory_complete_by),
          'inventory_send_profile', (SELECT json_build_object('name', u3.name) FROM users u3 WHERE u3.id = bs.inventory_user_send),
          'cut_received_profile', (SELECT json_build_object('name', u4.name) FROM users u4 WHERE u4.id = bs.cut_user_received),
          'cut_send_profile', (SELECT json_build_object('name', u5.name) FROM users u5 WHERE u5.id = bs.cut_user_send),
          'endorsement_received_profile', (SELECT json_build_object('name', u6.name) FROM users u6 WHERE u6.id = bs.endorsement_user_received),
          'endorsement_started_profile', (SELECT json_build_object('name', us2.name) FROM users us2 WHERE us2.id = bs.endorsement_session_started_by),
          'endorsement_complete_profile', (SELECT json_build_object('name', uc2.name) FROM users uc2 WHERE uc2.id = bs.endorsement_complete_by),
          'endorsement_send_profile', (SELECT json_build_object('name', u7.name) FROM users u7 WHERE u7.id = bs.endorsement_user_send),
          'scan_received_profile', (SELECT json_build_object('name', u8.name) FROM users u8 WHERE u8.id = bs.scan_user_received)
        ))
        FROM box_sessions bs WHERE bs.box_id = b.id
      ) as box_sessions
    FROM boxes b
    LEFT JOIN lots l ON b.lot_id = l.id
    WHERE 1=1
  `;
  const params = [];
  let paramIdx = 1;

  if (lot_id) {
    query += ` AND b.lot_id = $${paramIdx++}`;
    params.push(lot_id);
  }
  if (box_type) {
    query += ` AND b.box_type = $${paramIdx++}`;
    params.push(box_type.charAt(0).toUpperCase() + box_type.slice(1).toLowerCase());
  }
  if (current_stage) {
    if (current_stage.includes(',')) {
      const stages = current_stage.split(',');
      const stagePlaceholders = stages.map(() => `$${paramIdx++}`).join(',');
      query += ` AND b.current_stage IN (${stagePlaceholders})`;
      params.push(...stages);
    } else {
      query += ` AND b.current_stage = $${paramIdx++}`;
      params.push(current_stage);
    }
  }
  if (box_number) {
    query += ` AND b.box_number ILIKE $${paramIdx++}`;
    params.push(`%${box_number}%`);
  }
  if (isbnBoxIds && isbnBoxIds.length > 0) {
    const idPlaceholders = isbnBoxIds.map(() => `$${paramIdx++}`).join(',');
    query += ` AND b.id IN (${idPlaceholders})`;
    params.push(...isbnBoxIds);
  }

  query += ` ORDER BY b.created_at DESC`;

  try {
    const { rows } = await db.query(query, params);
    // Some boxes might have null box_sessions from json_agg if empty
    const data = rows.map(r => ({
      ...r,
      box_sessions: r.box_sessions || []
    }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBooksForBoxes = async (boxIds) => {
  if (!boxIds || !boxIds.length) return { data: [], error: null };
  try {
    const ph = boxIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await db.query(`SELECT id, box_id FROM books WHERE box_id IN (${ph})`, boxIds);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getInventoryScans = async (bookIds) => {
  if (!bookIds || !bookIds.length) return { data: [], error: null };
  try {
    const ph = bookIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await db.query(
      `SELECT inventory_scan_at, inventory_scan_by, book_id FROM book_activity WHERE book_id IN (${ph}) AND inventory_scan_at IS NOT NULL ORDER BY inventory_scan_at DESC`,
      bookIds
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getEndorsementScans = async (bookIds) => {
  if (!bookIds || !bookIds.length) return { data: [], error: null };
  try {
    const ph = bookIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await db.query(
      `SELECT endorsement_scan_at, endorsement_scan_by, book_id FROM book_activity WHERE book_id IN (${ph}) AND endorsement_scan_at IS NOT NULL ORDER BY endorsement_scan_at DESC`,
      bookIds
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getProfilesByIds = async (userIds) => {
  if (!userIds || !userIds.length) return { data: [], error: null };
  try {
    const ph = userIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await db.query(`SELECT id, name, email FROM users WHERE id IN (${ph})`, userIds);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getScanActivities = async (scanBoxIds) => {
  if (!scanBoxIds || !scanBoxIds.length) return { data: [], error: null };
  try {
    const ph = scanBoxIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await db.query(`
      SELECT ba.book_id, ba.transmission_status, b.box_id as "books.box_id"
      FROM book_activity ba
      JOIN books b ON ba.book_id = b.id
      WHERE b.box_id IN (${ph}) AND ba.scan_status = 'processable'
    `, scanBoxIds);
    const data = rows.map(r => ({
      book_id: r.book_id,
      transmission_status: r.transmission_status,
      books: { box_id: r['books.box_id'] }
    }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getAssignedStorageBoxIds = async () => {
  try {
    const { rows } = await db.query('SELECT box_id FROM storage_assignments');
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getLotsBySearch = async (safeSearch) => {
  try {
    const { rows } = await db.query('SELECT id FROM lots WHERE lot_number ILIKE $1', [`%${safeSearch}%`]);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getPipelineTransitionsQuery = async (limitNum, offsetNum, stage, box_type, search, date_from, date_to, lotIds) => {
  let query = `
    SELECT 
      bs.id,
      bs.warehouse_time_received, bs.warehouse_user_received,
      bs.inventory_time_received, bs.inventory_user_received,
      bs.inventory_time_send, bs.inventory_user_send,
      bs.cut_time_received, bs.cut_user_received,
      bs.cut_time_send, bs.cut_user_send,
      bs.endorsement_time_received, bs.endorsement_user_received,
      bs.endorsement_time_send, bs.endorsement_user_send,
      bs.scan_time_received, bs.scan_user_received,
      bs.total_scanned_books, bs.total_processable_books,
      bs.updated_at,
      json_build_object(
        'id', b.id,
        'box_number', b.box_number,
        'created_at', b.created_at,
        'lot', json_build_object('lot_number', l.lot_number),
        'box_type', b.box_type,
        'current_stage', b.current_stage,
        'total_expected_books', b.total_expected_books,
        'total_transmitted_books', b.total_transmitted_books,
        'books', (SELECT json_agg(json_build_object('title', bk.title)) FROM books bk WHERE bk.box_id = b.id)
      ) as box
    FROM box_sessions bs
    INNER JOIN boxes b ON bs.box_id = b.id
    LEFT JOIN lots l ON b.lot_id = l.id
    WHERE 1=1
  `;
  const params = [];
  let paramIdx = 1;

  if (box_type) {
    query += ` AND b.box_type = $${paramIdx++}`;
    params.push(box_type.charAt(0).toUpperCase() + box_type.slice(1).toLowerCase());
  }
  if (stage && stage !== 'all') {
    query += ` AND b.current_stage = $${paramIdx++}`;
    params.push(stage);
  }
  if (date_from) {
    query += ` AND bs.updated_at >= $${paramIdx++}`;
    params.push(`${date_from}T00:00:00.000Z`);
  }
  if (date_to) {
    query += ` AND bs.updated_at <= $${paramIdx++}`;
    params.push(`${date_to}T23:59:59.999Z`);
  }
  
  if (search) {
    if (lotIds && lotIds.length > 0) {
      const ph = lotIds.map(() => `$${paramIdx++}`).join(',');
      query += ` AND (b.box_number ILIKE $${paramIdx++} OR b.lot_id IN (${ph}))`;
      params.push(...lotIds, `%${search}%`); // actually need to order params correctly: lotIds then search
      // wait, let's fix param ordering:
      // it should be: b.box_number ILIKE $X OR b.lot_id IN ($Y...)
      // The push above is wrong order. Let's fix:
      params.pop(); // remove search
      // params now doesn't have lotIds or search.
      // Re-do:
      query = query.replace(`AND (b.box_number ILIKE $${paramIdx - 1} OR b.lot_id IN (${ph}))`, ''); 
      // safer way:
    } else {
      query += ` AND b.box_number ILIKE $${paramIdx++}`;
      params.push(`%${search}%`);
    }
  }

  // Handle lotIds safely
  if (search && lotIds && lotIds.length > 0) {
    const searchIdx = paramIdx++;
    const lotPh = lotIds.map(() => `$${paramIdx++}`).join(',');
    query += ` AND (b.box_number ILIKE $${searchIdx} OR b.lot_id IN (${lotPh}))`;
    params.push(`%${search}%`, ...lotIds);
  }

  query += ` ORDER BY bs.updated_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limitNum, offsetNum);

  try {
    const { rows } = await db.query(query, params);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getSessionCompletionForPipeline = async (boxIds) => {
  if (!boxIds || !boxIds.length) return { data: [], error: null };
  try {
    const ph = boxIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await db.query(`
      SELECT DISTINCT ON (box_id) box_id,
             warehouse_user_received as warehouse_complete_by, warehouse_time_received as warehouse_complete_at, 
             inventory_complete_by, inventory_complete_at, 
             endorsement_complete_by, endorsement_complete_at
      FROM box_sessions
      WHERE box_id IN (${ph})
      ORDER BY box_id, updated_at DESC
    `, boxIds);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getStorageAssignmentsForPipeline = async (boxIds) => {
  if (!boxIds || !boxIds.length) return { data: [], error: null };
  try {
    const ph = boxIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await db.query(`SELECT box_id, assigned_by, assigned_at FROM storage_assignments WHERE box_id IN (${ph})`, boxIds);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBoxByNumber = async (boxNumber) => {
  try {
    const { rows } = await db.query(`
      SELECT b.*, json_build_object('lot_number', l.lot_number, 'type', l.type) as lot
      FROM boxes b LEFT JOIN lots l ON b.lot_id = l.id
      WHERE b.box_number ILIKE $1 LIMIT 1
    `, [boxNumber]);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBookActivityForBox = async (boxId) => {
  try {
    const { rows } = await db.query(`
      SELECT ba.id, ba.scan_status, ba.warehouse_scan_at, ba.transmission_status,
             b.isbn as "books.isbn", b.title as "books.title", b.box_id as "books.box_id", b.book_type as "books.book_type"
      FROM book_activity ba JOIN books b ON ba.book_id = b.id
      WHERE b.box_id = $1 ORDER BY ba.warehouse_scan_at ASC
    `, [boxId]);
    const data = rows.map(r => ({
      id: r.id, scan_status: r.scan_status, warehouse_scan_at: r.warehouse_scan_at, transmission_status: r.transmission_status,
      books: { isbn: r['books.isbn'], title: r['books.title'], box_id: r['books.box_id'], book_type: r['books.book_type'] }
    }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBoxById = async (id) => {
  try {
    const { rows } = await db.query(`
      SELECT b.*, json_build_object('lot_number', l.lot_number, 'type', l.type) as lot
      FROM boxes b LEFT JOIN lots l ON b.lot_id = l.id
      WHERE b.id = $1 LIMIT 1
    `, [id]);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBookActivityWithFlags = async (boxId) => {
  try {
    const { rows } = await db.query(`
      SELECT ba.id, ba.scan_status, ba.warehouse_scan_at, ba.transmission_status,
             uf.rejection_reason as "user_flags.rejection_reason", uf.notes as "user_flags.notes",
             b.isbn as "books.isbn", b.title as "books.title", b.author as "books.author", b.box_id as "books.box_id"
      FROM book_activity ba 
      JOIN books b ON ba.book_id = b.id
      LEFT JOIN user_flags uf ON uf.book_activity_id = ba.id
      WHERE b.box_id = $1 ORDER BY ba.warehouse_scan_at ASC
    `, [boxId]);
    const grouped = new Map();
    for (const r of rows) {
      if (!grouped.has(r.id)) {
        grouped.set(r.id, {
          id: r.id, scan_status: r.scan_status, warehouse_scan_at: r.warehouse_scan_at, transmission_status: r.transmission_status,
          user_flags: [],
          books: { isbn: r['books.isbn'], title: r['books.title'], author: r['books.author'], box_id: r['books.box_id'] }
        });
      }
      if (r['user_flags.rejection_reason']) {
        grouped.get(r.id).user_flags.push({ rejection_reason: r['user_flags.rejection_reason'], notes: r['user_flags.notes'] });
      }
    }
    const data = Array.from(grouped.values());
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const searchLotByCandidate = async (candidate) => {
  try {
    const { rows } = await db.query('SELECT id, lot_number FROM lots WHERE lot_number ILIKE $1 LIMIT 1', [candidate]);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBoxesByLotId = async (lotId) => {
  try {
    const { rows } = await db.query(`
      SELECT b.*, (SELECT COUNT(*) FROM books bk WHERE bk.box_id = b.id) as books_count
      FROM boxes b WHERE b.lot_id = $1 ORDER BY b.box_number ASC
    `, [lotId]);
    const data = rows.map(r => ({ ...r, books: [{ count: parseInt(r.books_count, 10) }] }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateBoxStage = async (id, stage) => {
  try {
    const { rows } = await db.query('UPDATE boxes SET current_stage = $1 WHERE id = $2 RETURNING *', [stage, id]);
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateBoxReceived = async (id) => {
  try {
    const { rows } = await db.query('UPDATE boxes SET updated_at = NOW() WHERE id = $1 RETURNING *', [id]);
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getLatestActiveSession = async (boxId) => {
  try {
    const { rows } = await db.query(`
      SELECT id, status FROM box_sessions WHERE box_id = $1 AND status IN ('completed', 'received') ORDER BY warehouse_time_received DESC LIMIT 1
    `, [boxId]);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateSession = async (sessionId, updates) => {
  const keys = Object.keys(updates);
  if (keys.length === 0) return { error: null };
  const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = Object.values(updates);
  try {
    await db.query(`UPDATE box_sessions SET ${setString} WHERE id = $${keys.length + 1}`, [...values, sessionId]);
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const updateSessionPrint = async (boxId, userId) => {
  try {
    const { rows: sessionRows } = await db.query(`
      SELECT id FROM box_sessions WHERE box_id = $1 ORDER BY updated_at DESC LIMIT 1
    `, [boxId]);
    if (sessionRows.length === 0) return { error: null };
    
    await db.query(`
      UPDATE box_sessions SET inventory_printed_by = $1, inventory_printed_at = NOW()
      WHERE id = $2
    `, [userId, sessionRows[0].id]);
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const getProcessableBooksForBox = async (boxId) => {
  try {
    const { rows } = await db.query(`
      SELECT b.isbn, b.box_id as "books.box_id"
      FROM book_activity ba JOIN books b ON ba.book_id = b.id
      WHERE b.box_id = $1 AND ba.scan_status = 'processable'
    `, [boxId]);
    const data = rows.map(r => ({ books: { isbn: r.isbn, box_id: r['books.box_id'] } }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateSessionToReceived = async (boxId, userId, nextStage) => {
  if (nextStage === 'inventory') {
    try {
      await db.query(`
        UPDATE box_sessions SET status = 'received', inventory_user_received = $1, inventory_time_received = NOW() 
        WHERE box_id = $2 AND status = 'completed'
      `, [userId, boxId]);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }
};

export const getSessionForAdvance = async (boxId) => {
  try {
    const { rows } = await db.query(`
      SELECT id, status FROM box_sessions WHERE box_id = $1 ORDER BY warehouse_time_received DESC LIMIT 1
    `, [boxId]);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteBooks = async (boxId) => {
  try {
    const { rows } = await db.query('SELECT id FROM books WHERE box_id = $1', [boxId]);
    if (rows.length > 0) {
      const ph = rows.map((_, i) => `$${i + 1}`).join(',');
      const ids = rows.map(r => r.id);
      await db.query(`DELETE FROM book_activity WHERE book_id IN (${ph})`, ids);
      await db.query(`DELETE FROM books WHERE id IN (${ph})`, ids);
    }
  } catch (error) {
    // Ignore internally
  }
};

export const deleteStorageAssignments = async (boxId) => {
  try {
    await db.query('DELETE FROM storage_assignments WHERE box_id = $1', [boxId]);
  } catch (error) {}
};

export const deleteBox = async (boxId) => {
  try {
    await db.query('DELETE FROM boxes WHERE id = $1', [boxId]);
    return { error: null };
  } catch (error) {
    return { error };
  }
};
