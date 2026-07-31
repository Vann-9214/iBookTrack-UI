/**
 * repositories/dashboard.js
 *
 * Database access for dashboard statistics and aggregations.
 * Uses vanilla PostgreSQL queries.
 */

import { db } from '../../config/db.js';

export const getLotByNumber = async (lotNumber, lotType = null) => {
  try {
    let query = 'SELECT id FROM lots WHERE lot_number = $1';
    let params = [lotNumber];
    if (lotType) {
      query += ' AND type = $2';
      params.push(lotType);
    }
    query += ' LIMIT 1';
    const { rows } = await db.query(query, params);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getLotsInRange = async (start, end, lotType = null) => {
  try {
    let query = 'SELECT id FROM lots WHERE lot_number >= $1 AND lot_number <= $2';
    let params = [start, end];
    if (lotType) {
      query += ' AND type = $3';
      params.push(lotType);
    }
    const { rows } = await db.query(query, params);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const countBoxes = async (lotIds, boxType) => {
  let query = 'SELECT COUNT(*) as count FROM boxes WHERE 1=1';
  const params = [];
  let pIdx = 1;

  if (lotIds && lotIds.length > 0) {
    const ph = lotIds.map(() => `$${pIdx++}`).join(',');
    query += ` AND lot_id IN (${ph})`;
    params.push(...lotIds);
  }
  if (boxType) {
    query += ` AND box_type = $${pIdx++}`;
    params.push(boxType);
  }

  try {
    const { rows } = await db.query(query, params);
    return { count: parseInt(rows[0].count, 10), error: null };
  } catch (error) {
    return { count: 0, error };
  }
};

export const countBooks = async (lotIds, boxType) => {
  let query = 'SELECT COUNT(b.id) as count FROM books b JOIN boxes bx ON b.box_id = bx.id WHERE 1=1';
  const params = [];
  let pIdx = 1;

  if (lotIds && lotIds.length > 0) {
    const ph = lotIds.map(() => `$${pIdx++}`).join(',');
    query += ` AND bx.lot_id IN (${ph})`;
    params.push(...lotIds);
  }
  if (boxType) {
    query += ` AND bx.box_type = $${pIdx++}`;
    params.push(boxType);
  }

  try {
    const { rows } = await db.query(query, params);
    return { count: parseInt(rows[0].count, 10), error: null };
  } catch (error) {
    return { count: 0, error };
  }
};

export const countUnaccountedBooks = async (startIso, endIso, boxType) => {
  let query = `
    SELECT COUNT(uf.id) as count 
    FROM user_flags uf
    JOIN book_activity ba ON uf.book_activity_id = ba.id
    JOIN books b ON ba.book_id = b.id
    JOIN boxes bx ON b.box_id = bx.id
    WHERE (
      (uf.warehouse_flag_at >= $1 AND uf.warehouse_flag_at < $2) OR
      (uf.inventory_flag_at >= $1 AND uf.inventory_flag_at < $2) OR
      (uf.endorsement_flag_at >= $1 AND uf.endorsement_flag_at < $2) OR
      (uf.scan_flag_at >= $1 AND uf.scan_flag_at < $2)
    )
  `;
  const params = [startIso, endIso];
  if (boxType) {
    query += ` AND bx.box_type = $3`;
    params.push(boxType);
  }

  try {
    const { rows } = await db.query(query, params);
    return { count: parseInt(rows[0].count, 10), error: null };
  } catch (error) {
    return { count: 0, error };
  }
};

export const getAllLotsWithBoxes = async () => {
  const query = `
    SELECT l.id, l.type, 
      (SELECT json_agg(json_build_object('current_stage', bx.current_stage)) FROM boxes bx WHERE bx.lot_id = l.id) as boxes 
    FROM lots l
  `;
  try {
    const { rows } = await db.query(query);
    const data = rows.map(r => ({ ...r, boxes: r.boxes || [] }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getOpenLots = async (brand) => {
  let query = `
    SELECT l.id, l.lot_number, l.type, 
      (SELECT json_agg(json_build_object(
        'id', bx.id, 'current_stage', bx.current_stage, 
        'total_expected_books', bx.total_expected_books, 'total_transmitted_books', bx.total_transmitted_books,
        'session_status', (SELECT status FROM box_sessions bs WHERE bs.box_id = bx.id ORDER BY bs.updated_at DESC LIMIT 1),
        'book_activities', (
          SELECT json_agg(json_build_object(
            'scan_status', ba.scan_status, 
            'transmission_status', ba.transmission_status
          ))
          FROM book_activity ba
          JOIN books b ON b.id = ba.book_id
          WHERE b.box_id = bx.id
        )
      )) FROM boxes bx WHERE bx.lot_id = l.id) as boxes 
    FROM lots l
  `;
  const params = [];
  if (brand) {
    query += ` WHERE l.type = $1`;
    params.push(brand);
  }
  query += ` ORDER BY l.created_at DESC`;

  try {
    const { rows } = await db.query(query, params);
    const data = rows.map(r => ({ ...r, boxes: r.boxes || [] }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getQcFlags = async (page, limit, boxType, startIso, endIso) => {
  const offset = (page - 1) * limit;
  let query = `
    SELECT * FROM (
      SELECT DISTINCT ON (uf.book_activity_id)
        uf.id, uf.book_activity_id, uf.rejection_reason, uf.notes,
        uf.warehouse_flag_by, uf.warehouse_flag_at,
        uf.inventory_flag_by, uf.inventory_flag_at,
        uf.endorsement_flag_by, uf.endorsement_flag_at,
        uf.scan_flag_by, uf.scan_flag_at,
        wu.name as "warehouse_user.name",
        iu.name as "inventory_user.name",
        eu.name as "endorsement_user.name",
        su.name as "scan_user.name",
        ba.id as "book_activity.id",
        b.isbn as "books.isbn", b.title as "books.title",
        bx.box_number as "boxes.box_number", bx.box_type as "boxes.box_type",
        l.lot_number as "lots.lot_number"
      FROM user_flags uf
      LEFT JOIN users wu ON uf.warehouse_flag_by = wu.id
      LEFT JOIN users iu ON uf.inventory_flag_by = iu.id
      LEFT JOIN users eu ON uf.endorsement_flag_by = eu.id
      LEFT JOIN users su ON uf.scan_flag_by = su.id
      JOIN book_activity ba ON uf.book_activity_id = ba.id
      JOIN books b ON ba.book_id = b.id
      JOIN boxes bx ON b.box_id = bx.id
      LEFT JOIN lots l ON bx.lot_id = l.id
      WHERE 1=1
  `;
  
  const params = [];
  let pIdx = 1;

  if (boxType) {
    query += ` AND bx.box_type = $${pIdx++}`;
    params.push(boxType);
  } else {
    query += ` AND bx.box_type IN ('Mustang', 'Jaguar')`;
  }

  if (startIso && endIso) {
    query += ` AND (
      (uf.warehouse_flag_at >= $${pIdx} AND uf.warehouse_flag_at < $${pIdx + 1}) OR
      (uf.inventory_flag_at >= $${pIdx} AND uf.inventory_flag_at < $${pIdx + 1}) OR
      (uf.endorsement_flag_at >= $${pIdx} AND uf.endorsement_flag_at < $${pIdx + 1}) OR
      (uf.scan_flag_at >= $${pIdx} AND uf.scan_flag_at < $${pIdx + 1})
    )`;
    params.push(startIso, endIso);
    pIdx += 2;
  }

  query += ` ORDER BY uf.book_activity_id, uf.warehouse_flag_at DESC ) as unique_flags ORDER BY unique_flags.warehouse_flag_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
  params.push(limit, offset);

  // Get total count
  const countQuery = `
    SELECT COUNT(DISTINCT uf.book_activity_id) as count FROM user_flags uf
    JOIN book_activity ba ON uf.book_activity_id = ba.id
    JOIN books b ON ba.book_id = b.id
    JOIN boxes bx ON b.box_id = bx.id
    WHERE bx.box_type ${boxType ? `= '${boxType}'` : `IN ('Mustang', 'Jaguar')`}
    ${(startIso && endIso) ? `AND ((uf.warehouse_flag_at >= '${startIso}' AND uf.warehouse_flag_at < '${endIso}') OR (uf.inventory_flag_at >= '${startIso}' AND uf.inventory_flag_at < '${endIso}') OR (uf.endorsement_flag_at >= '${startIso}' AND uf.endorsement_flag_at < '${endIso}') OR (uf.scan_flag_at >= '${startIso}' AND uf.scan_flag_at < '${endIso}'))` : ''}
  `;

  try {
    const [{ rows: dataRows }, { rows: countRows }] = await Promise.all([
      db.query(query, params),
      db.query(countQuery)
    ]);

    const data = dataRows.map(r => ({
      id: r.id, book_activity_id: r.book_activity_id, rejection_reason: r.rejection_reason, notes: r.notes,
      warehouse_flag_by: r.warehouse_flag_by, warehouse_flag_at: r.warehouse_flag_at,
      inventory_flag_by: r.inventory_flag_by, inventory_flag_at: r.inventory_flag_at,
      endorsement_flag_by: r.endorsement_flag_by, endorsement_flag_at: r.endorsement_flag_at,
      scan_flag_by: r.scan_flag_by, scan_flag_at: r.scan_flag_at,
      warehouse_user: r['warehouse_user.name'] ? { name: r['warehouse_user.name'] } : null,
      inventory_user: r['inventory_user.name'] ? { name: r['inventory_user.name'] } : null,
      endorsement_user: r['endorsement_user.name'] ? { name: r['endorsement_user.name'] } : null,
      scan_user: r['scan_user.name'] ? { name: r['scan_user.name'] } : null,
      book_activity: {
        id: r['book_activity.id'],
        books: {
          isbn: r['books.isbn'], title: r['books.title'],
          boxes: { box_number: r['boxes.box_number'], box_type: r['boxes.box_type'], lot: { lot_number: r['lots.lot_number'] } }
        }
      }
    }));
    return { data, count: parseInt(countRows[0].count, 10), error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBooksByIsbnsWithLots = async (isbns) => {
  if (!isbns || !isbns.length) return { data: [], error: null };
  const ph = isbns.map((_, i) => `$${i + 1}`).join(',');
  const query = `
    SELECT b.isbn, b.title, bx.box_number as "boxes.box_number", l.lot_number as "lots.lot_number"
    FROM books b
    LEFT JOIN boxes bx ON b.box_id = bx.id
    LEFT JOIN lots l ON bx.lot_id = l.id
    WHERE b.isbn IN (${ph})
  `;
  try {
    const { rows } = await db.query(query, isbns);
    const data = rows.map(r => ({
      isbn: r.isbn, title: r.title,
      box: r['boxes.box_number'] ? { box_number: r['boxes.box_number'], lot: r['lots.lot_number'] ? { lot_number: r['lots.lot_number'] } : null } : null
    }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const resolveQcFlag = async (id) => {
  try {
    await db.query('BEGIN');
    const { rows } = await db.query('DELETE FROM user_flags WHERE id = $1 RETURNING book_activity_id, rejection_reason', [id]);
    if (rows.length === 0) {
      await db.query('ROLLBACK');
      return { success: false, error: { status: 404, message: 'Flag not found' } };
    }
    const { book_activity_id, rejection_reason } = rows[0];
    
    const { rows: actRows } = await db.query('UPDATE book_activity SET scan_status = $1 WHERE id = $2 RETURNING session_id, book_id', ['processable', book_activity_id]);
    const session_id = actRows[0]?.session_id;
    const book_id = actRows[0]?.book_id;

    if (session_id) {
      await db.query(
        'UPDATE box_sessions SET total_processable_books = total_processable_books + 1, total_nonprocessable_books = GREATEST(0, total_nonprocessable_books - 1) WHERE id = $1',
        [session_id]
      );
    }

    const reasonStr = (rejection_reason || '').toLowerCase().trim();
    if (reasonStr === 'extra-book' || reasonStr === 'extra') {
      await db.query('UPDATE books SET is_extra = false WHERE id = $1', [book_id]);
    }

    let box_id = null;
    if (book_id) {
      const { rows: bRows } = await db.query('SELECT box_id FROM books WHERE id = $1', [book_id]);
      box_id = bRows[0]?.box_id;
    }

    await db.query('COMMIT');
    return { success: true, box_id, error: null };
  } catch (error) {
    await db.query('ROLLBACK');
    return { success: false, error };
  }
};

export const searchLotByCandidate = async (candidate) => {
  try {
    const { rows } = await db.query('SELECT id, lot_number, type FROM lots WHERE lot_number ILIKE $1 LIMIT 1', [candidate]);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBoxesByLotId = async (lotId) => {
  const query = `
    SELECT b.id, b.current_stage, b.total_expected_books, 
           (SELECT COUNT(*) FROM books bk WHERE bk.box_id = b.id) as books_count
    FROM boxes b WHERE b.lot_id = $1 ORDER BY b.box_number ASC
  `;
  try {
    const { rows } = await db.query(query, [lotId]);
    const data = rows.map(r => ({ ...r, books: [{ count: parseInt(r.books_count, 10) }] }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBookActivitiesByBoxIds = async (boxIds) => {
  if (!boxIds || !boxIds.length) return { data: [], error: null };
  const ph = boxIds.map((_, i) => `$${i + 1}`).join(',');
  try {
    const { rows } = await db.query(`
      SELECT ba.scan_status, b.box_id as "books.box_id" 
      FROM book_activity ba JOIN books b ON ba.book_id = b.id 
      WHERE b.box_id IN (${ph})
    `, boxIds);
    const data = rows.map(r => ({ scan_status: r.scan_status, books: { box_id: r['books.box_id'] } }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getProcessedBoxesToday = async (startIso, endIso, lotId, brand) => {
  let query = `
    SELECT b.id, b.current_stage, b.box_type, b.total_expected_books, bs.id as "box_sessions.id"
    FROM boxes b
    JOIN box_sessions bs ON bs.box_id = b.id
    WHERE bs.updated_at >= $1 AND bs.updated_at < $2
  `;
  const params = [startIso, endIso];
  let pIdx = 3;
  if (lotId) { query += ` AND b.lot_id = $${pIdx++}`; params.push(lotId); }
  if (brand) { query += ` AND b.box_type = $${pIdx++}`; params.push(brand); }

  try {
    const { rows } = await db.query(query, params);
    const data = rows.map(r => ({
      id: r.id, current_stage: r.current_stage, box_type: r.box_type, total_expected_books: r.total_expected_books,
      box_sessions: [{ id: r['box_sessions.id'] }]
    }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBoxesInScanStage = async (lotId, brand) => {
  let query = `
    SELECT b.id, b.current_stage, b.box_type, b.total_expected_books, bs.id as "box_sessions.id"
    FROM boxes b
    JOIN box_sessions bs ON bs.box_id = b.id
    WHERE b.current_stage = 'scan'
  `;
  const params = [];
  let pIdx = 1;
  if (lotId) { query += ` AND b.lot_id = $${pIdx++}`; params.push(lotId); }
  if (brand) { query += ` AND b.box_type = $${pIdx++}`; params.push(brand); }

  try {
    const { rows } = await db.query(query, params);
    const data = rows.map(r => ({
      id: r.id, current_stage: r.current_stage, box_type: r.box_type, total_expected_books: r.total_expected_books,
      box_sessions: [{ id: r['box_sessions.id'] }]
    }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getProcessableBookActivitiesForBoxes = async (boxIds) => {
  if (!boxIds || !boxIds.length) return { data: [], error: null };
  const ph = boxIds.map((_, i) => `$${i + 1}`).join(',');
  try {
    const { rows } = await db.query(`
      SELECT ba.book_id, ba.scan_status, b.isbn as "books.isbn", b.box_id as "books.box_id" 
      FROM book_activity ba JOIN books b ON ba.book_id = b.id 
      WHERE b.box_id IN (${ph}) AND ba.scan_status = 'processable'
    `, boxIds);
    const data = rows.map(r => ({
      book_id: r.book_id, scan_status: r.scan_status, books: { isbn: r['books.isbn'], box_id: r['books.box_id'] }
    }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
