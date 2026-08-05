/**
 * repositories/storage.js
 *
 * Database access for storage operations.
 * Uses vanilla PostgreSQL queries.
 */

import { db } from '../../config/db.js';

export const getStorageLocationsWithAssignments = async () => {
  const query = `
    SELECT 
      sl.id, sl.shelf, sl.rack, sl.level, sl.capacity,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', sa.id, 'status', sa.status, 'assigned_at', sa.assigned_at,
          'box', (
            SELECT json_build_object(
              'id', bx.id, 'box_number', bx.box_number, 'total_expected_books', bx.total_expected_books, 'lot_id', bx.lot_id,
              'lot', (SELECT json_build_object('lot_number', l.lot_number) FROM lots l WHERE l.id = bx.lot_id),
              'books', (
                SELECT COALESCE(json_agg(json_build_object(
                  'isbn', bk.isbn, 'title', bk.title, 'author', bk.author,
                  'scans', (
                    SELECT COALESCE(json_agg(json_build_object('scan_status', ba.scan_status)), '[]'::json)
                    FROM book_activity ba WHERE ba.book_id = bk.id
                  )
                )), '[]'::json)
                FROM books bk WHERE bk.box_id = bx.id
              )
            )
            FROM boxes bx WHERE bx.id = sa.box_id
          )
        )), '[]'::json)
        FROM storage_assignments sa WHERE sa.storage_location_id = sl.id
      ) as assignments
    FROM storage_locations sl
    ORDER BY sl.rack ASC, sl.level ASC
  `;
  try {
    const { rows } = await db.query(query);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const upsertStorageLocations = async (rowsData) => {
  if (!rowsData || !rowsData.length) return { data: [], error: null };
  
  const values = [];
  const placeholders = rowsData.map((row, i) => {
    const offset = i * 4;
    values.push(row.shelf, row.rack, row.level, row.capacity);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
  }).join(', ');

  const query = `
    INSERT INTO storage_locations (shelf, rack, level, capacity)
    VALUES ${placeholders}
    ON CONFLICT (shelf, rack, level) DO UPDATE 
    SET capacity = EXCLUDED.capacity
    RETURNING *
  `;
  try {
    const { rows } = await db.query(query, values);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getStorageLocationsByIds = async (rackIds) => {
  if (!rackIds || !rackIds.length) return { data: [], error: null };
  const ph = rackIds.map((_, i) => `$${i + 1}`).join(',');
  try {
    const { rows } = await db.query(`SELECT id, shelf, rack, level, capacity FROM storage_locations WHERE rack IN (${ph})`, rackIds);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getStorageLocationById = async (id) => {
  try {
    const { rows } = await db.query(`
      SELECT sl.capacity, sl.shelf, sl.rack, sl.level,
        (SELECT COALESCE(json_agg(json_build_object('id', sa.id)), '[]'::json) FROM storage_assignments sa WHERE sa.storage_location_id = sl.id) as assignments
      FROM storage_locations sl WHERE sl.id = $1 LIMIT 1
    `, [id]);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateStorageLocationCapacity = async (id, capacity) => {
  try {
    const { rows } = await db.query('UPDATE storage_locations SET capacity = $1 WHERE id = $2 RETURNING id, shelf, rack, level, capacity', [capacity, id]);
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteStorageLocation = async (id) => {
  try {
    await db.query('DELETE FROM storage_locations WHERE id = $1', [id]);
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const getAssignedBoxIds = async () => {
  try {
    const { rows } = await db.query('SELECT box_id FROM storage_assignments');
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getScanStageBoxes = async (boxType, excludedBoxIds = []) => {
  let query = `
    SELECT b.id, b.box_number, b.total_expected_books, b.lot_id,
      json_build_object('lot_number', l.lot_number) as lot,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'isbn', bk.isbn, 'title', bk.title, 'author', bk.author,
          'scans', (
            SELECT COALESCE(json_agg(json_build_object('scan_status', ba.scan_status, 'transmission_status', ba.transmission_status)), '[]'::json)
            FROM book_activity ba WHERE ba.book_id = bk.id
          )
        )), '[]'::json)
        FROM books bk WHERE bk.box_id = b.id
      ) as books
    FROM boxes b
    LEFT JOIN lots l ON b.lot_id = l.id
    WHERE b.current_stage = 'scan'
  `;
  const params = [];
  let pIdx = 1;

  if (boxType) {
    query += ` AND b.box_type = $${pIdx++}`;
    params.push(boxType.charAt(0).toUpperCase() + boxType.slice(1).toLowerCase());
  }
  if (excludedBoxIds.length > 0) {
    const ph = excludedBoxIds.map(() => `$${pIdx++}`).join(',');
    query += ` AND b.id NOT IN (${ph})`;
    params.push(...excludedBoxIds);
  }
  query += ` ORDER BY b.created_at DESC`;

  try {
    const { rows } = await db.query(query, params);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getStorageAssignmentsByLocationId = async (locationId) => {
  try {
    const { rows } = await db.query('SELECT id FROM storage_assignments WHERE storage_location_id = $1', [locationId]);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getStorageAssignmentsByBoxIds = async (boxIds) => {
  if (!boxIds || !boxIds.length) return { data: [], error: null };
  const ph = boxIds.map((_, i) => `$${i + 1}`).join(',');
  try {
    const { rows } = await db.query(`SELECT box_id FROM storage_assignments WHERE box_id IN (${ph})`, boxIds);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBoxesByIds = async (boxIds) => {
  if (!boxIds || !boxIds.length) return { data: [], error: null };
  const ph = boxIds.map((_, i) => `$${i + 1}`).join(',');
  try {
    const { rows } = await db.query(`SELECT id, box_number, current_stage FROM boxes WHERE id IN (${ph})`, boxIds);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const insertStorageAssignments = async (assignments) => {
  if (!assignments || !assignments.length) return { data: [], error: null };
  
  const values = [];
  const placeholders = assignments.map((a, i) => {
    const offset = i * 3;
    values.push(a.box_id, a.storage_location_id, a.assigned_by);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
  }).join(', ');

  const query = `
    INSERT INTO storage_assignments (box_id, storage_location_id, assigned_by)
    VALUES ${placeholders}
    RETURNING *
  `;
  try {
    const { rows } = await db.query(query, values);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteStorageAssignments = async (assignmentIds) => {
  if (!assignmentIds || !assignmentIds.length) return { data: [], error: null };
  const ph = assignmentIds.map((_, i) => `$${i + 1}`).join(',');
  try {
    const { rows } = await db.query(`DELETE FROM storage_assignments WHERE id IN (${ph}) RETURNING box_id`, assignmentIds);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateBoxesStage = async (boxIds, stage) => {
  if (!boxIds || !boxIds.length) return { data: [], error: null };
  const ph = boxIds.map((_, i) => `$${i + 1}`).join(',');
  try {
    const { rows } = await db.query(`UPDATE boxes SET current_stage = $${boxIds.length + 1} WHERE id IN (${ph}) RETURNING *`, [...boxIds, stage]);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const searchBoxesByNumber = async (queryStr, boxType) => {
  let query = `SELECT id, box_number FROM boxes WHERE box_number ILIKE $1`;
  const params = [`%${queryStr}%`];
  if (boxType) {
    query += ` AND box_type = $2`;
    params.push(boxType.charAt(0).toUpperCase() + boxType.slice(1).toLowerCase());
  }
  query += ` LIMIT 10`;
  try {
    const { rows } = await db.query(query, params);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const searchBookActivityByIsbn = async (queryStr) => {
  try {
    const { rows } = await db.query(`
      SELECT b.box_id as "book.box_id", b.isbn as "book.isbn", b.title as "book.title"
      FROM book_activity ba
      JOIN books b ON ba.book_id = b.id
      WHERE b.isbn ILIKE $1 LIMIT 10
    `, [`%${queryStr}%`]);
    const data = rows.map(r => ({ book: { box_id: r['book.box_id'], isbn: r['book.isbn'], title: r['book.title'] } }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const searchLotsByNumber = async (queryStr) => {
  try {
    const { rows } = await db.query(`SELECT id, lot_number FROM lots WHERE lot_number ILIKE $1 LIMIT 10`, [`%${queryStr}%`]);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const searchBoxesByLotIds = async (lotIds, boxType) => {
  if (!lotIds || !lotIds.length) return { data: [], error: null };
  const ph = lotIds.map((_, i) => `$${i + 1}`).join(',');
  let query = `SELECT id, box_number FROM boxes WHERE lot_id IN (${ph})`;
  const params = [...lotIds];
  if (boxType) {
    query += ` AND box_type = $${params.length + 1}`;
    params.push(boxType.charAt(0).toUpperCase() + boxType.slice(1).toLowerCase());
  }
  query += ` LIMIT 10`;
  try {
    const { rows } = await db.query(query, params);
    return { data: rows, count: rows.length, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getStorageAssignmentsForSearch = async (boxIds) => {
  if (!boxIds || !boxIds.length) return { data: [], error: null };
  const ph = boxIds.map((_, i) => `$${i + 1}`).join(',');
  try {
    const { rows } = await db.query(`
      SELECT sa.id, sa.status,
             json_build_object('id', b.id, 'box_number', b.box_number, 'lot', json_build_object('lot_number', l.lot_number)) as box,
             json_build_object('id', sl.id, 'shelf', sl.shelf, 'rack', sl.rack, 'level', sl.level) as location
      FROM storage_assignments sa
      JOIN boxes b ON sa.box_id = b.id
      LEFT JOIN lots l ON b.lot_id = l.id
      JOIN storage_locations sl ON sa.storage_location_id = sl.id
      WHERE sa.box_id IN (${ph})
    `, Array.from(boxIds));
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getPendingStorageAssignments = async (boxType) => {
  let query = `
    SELECT sa.id, sa.status, sa.assigned_at,
           json_build_object('id', b.id, 'box_number', b.box_number, 'total_expected_books', b.total_expected_books, 'lot_id', b.lot_id, 'box_type', b.box_type, 'lot', json_build_object('lot_number', l.lot_number)) as box,
           json_build_object('id', sl.id, 'shelf', sl.shelf, 'rack', sl.rack, 'level', sl.level) as location
    FROM storage_assignments sa
    JOIN boxes b ON sa.box_id = b.id
    LEFT JOIN lots l ON b.lot_id = l.id
    JOIN storage_locations sl ON sa.storage_location_id = sl.id
    WHERE sa.status = 'pending'
  `;
  const params = [];
  if (boxType) {
    query += ` AND b.box_type = $1`;
    params.push(boxType.charAt(0).toUpperCase() + boxType.slice(1).toLowerCase());
  }
  query += ` ORDER BY sa.assigned_at DESC`;

  try {
    const { rows } = await db.query(query, params);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateStorageAssignmentStatus = async (id, status) => {
  try {
    const { rows } = await db.query('UPDATE storage_assignments SET status = $1 WHERE id = $2 RETURNING id, status, box_id', [status, id]);
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error };
  }
};
