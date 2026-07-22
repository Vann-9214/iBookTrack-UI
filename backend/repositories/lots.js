/**
 * repositories/lots.js
 *
 * Database access layer for lots.
 * Uses vanilla PostgreSQL queries.
 */

import { db } from '../config/db.js';

export const getLotsCount = async (search, lotType) => {
  let query = 'SELECT COUNT(*) as count FROM lots WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (search) {
    query += ` AND lot_number ILIKE $${paramIndex}`;
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  if (lotType) {
    query += ` AND type = $${paramIndex}`;
    params.push(lotType);
    paramIndex++;
  }

  const { rows } = await db.query(query, params);
  return parseInt(rows[0].count, 10);
};

export const getLotsList = async (offset, limit, search, lotType) => {
  let query = `
    SELECT 
      l.id, l.lot_number, l.total_boxes, l.type, l.created_at,
      (SELECT COUNT(*) FROM boxes b WHERE b.lot_id = l.id) as boxes_count
    FROM lots l
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (search) {
    query += ` AND l.lot_number ILIKE $${paramIndex}`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (lotType) {
    query += ` AND l.type = $${paramIndex}`;
    params.push(lotType);
    paramIndex++;
  }

  query += ` ORDER BY l.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const { rows } = await db.query(query, params);
  
  // Format to match old Supabase response shape: boxes: [{ count: X }]
  return rows.map(row => ({
    id: row.id,
    lot_number: row.lot_number,
    total_boxes: row.total_boxes,
    type: row.type,
    created_at: row.created_at,
    boxes: [{ count: parseInt(row.boxes_count, 10) }]
  }));
};

export const getLotByNumberOrLatest = async (lot_number, lotType) => {
  let query = 'SELECT id, lot_number, type FROM lots WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (lotType) {
    query += ` AND type = $${paramIndex}`;
    params.push(lotType);
    paramIndex++;
  }

  if (lot_number.toLowerCase() === 'latest') {
    query += ' ORDER BY created_at DESC LIMIT 1';
  } else {
    query += ` AND lot_number ILIKE $${paramIndex}`;
    params.push(lot_number);
  }

  try {
    const { rows } = await db.query(query, params);
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getLotBoxes = async (lot_id) => {
  const { rows } = await db.query('SELECT id FROM boxes WHERE lot_id = $1', [lot_id]);
  return rows;
};

export const getBookActivitiesForBoxes = async (boxIds) => {
  if (!boxIds || boxIds.length === 0) return [];
  
  // Create a parameterized IN clause e.g., $1, $2, $3
  const placeholders = boxIds.map((_, i) => `$${i + 1}`).join(', ');
  
  const query = `
    SELECT 
      ba.id, ba.scan_status, ba.warehouse_scan_at,
      uf.rejection_reason as "user_flags.rejection_reason",
      b.isbn as "books.isbn", b.title as "books.title", b.box_id as "books.box_id",
      bx.box_number as "boxes.box_number", bx.current_stage as "boxes.current_stage"
    FROM book_activity ba
    INNER JOIN books b ON ba.book_id = b.id
    INNER JOIN boxes bx ON b.box_id = bx.id
    LEFT JOIN user_flags uf ON uf.book_activity_id = ba.id
    WHERE b.box_id IN (${placeholders})
    ORDER BY ba.warehouse_scan_at DESC
  `;

  const { rows } = await db.query(query, boxIds);
  
  // Map flattened rows back to Supabase nested structure expected by the frontend
  return rows.map(row => ({
    id: row.id,
    scan_status: row.scan_status,
    warehouse_scan_at: row.warehouse_scan_at,
    user_flags: row['user_flags.rejection_reason'] ? [{ rejection_reason: row['user_flags.rejection_reason'] }] : [],
    books: {
      isbn: row['books.isbn'],
      title: row['books.title'],
      box_id: row['books.box_id'],
      boxes: {
        box_number: row['boxes.box_number'],
        current_stage: row['boxes.current_stage']
      }
    }
  }));
};

export const getLotWithBoxesByNumber = async (lot_number) => {
  try {
    // Fetch the lot
    const { rows: lots } = await db.query('SELECT * FROM lots WHERE lot_number = $1', [lot_number]);
    if (lots.length === 0) return null;
    const lot = lots[0];

    // Fetch its boxes
    const { rows: boxes } = await db.query('SELECT * FROM boxes WHERE lot_id = $1', [lot.id]);
    
    // Attach nested array
    lot.boxes = boxes;
    
    return lot;
  } catch (error) {
    throw error;
  }
};
