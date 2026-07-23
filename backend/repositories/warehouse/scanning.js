/**
 * repositories/scanning.js
 *
 * Database access for scanning-related operations.
 * Uses vanilla PostgreSQL queries.
 */

import { db } from '../../config/db.js';

export const getBooksByIsbns = async (isbns) => {
  if (!isbns || isbns.length === 0) return { data: [], error: null };
  const placeholders = isbns.map((_, i) => `$${i + 1}`).join(', ');
  
  const query = `
    SELECT 
      b.isbn, 
      bx.box_number as "boxes.box_number", 
      l.lot_number as "lots.lot_number"
    FROM books b
    LEFT JOIN boxes bx ON b.box_id = bx.id
    LEFT JOIN lots l ON bx.lot_id = l.id
    WHERE b.isbn IN (${placeholders})
  `;
  
  try {
    const { rows } = await db.query(query, isbns);
    const data = rows.map(row => ({
      isbn: row.isbn,
      box: row['boxes.box_number'] ? { 
        box_number: row['boxes.box_number'], 
        lot: row['lots.lot_number'] ? { lot_number: row['lots.lot_number'] } : null
      } : null
    }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getTransmitBooksByIsbnsAndType = async (isbns, boxType) => {
  if (!isbns || isbns.length === 0) return { data: [], error: null };
  
  const placeholders = isbns.map((_, i) => `$${i + 1}`).join(', ');
  const params = [...isbns, boxType];
  const typeIndex = isbns.length + 1;
  
  const query = `
    SELECT 
      b.id, b.isbn, b.title, 
      bx.box_number as "boxes.box_number", 
      bx.current_stage as "boxes.current_stage", 
      bx.box_type as "boxes.box_type", 
      l.lot_number as "lots.lot_number"
    FROM books b
    INNER JOIN boxes bx ON b.box_id = bx.id
    LEFT JOIN lots l ON bx.lot_id = l.id
    WHERE b.isbn IN (${placeholders})
      AND bx.current_stage = 'scan'
      AND bx.box_type = $${typeIndex}
  `;
  
  try {
    const { rows } = await db.query(query, params);
    const data = rows.map(row => ({
      id: row.id,
      isbn: row.isbn,
      title: row.title,
      boxes: {
        box_number: row['boxes.box_number'],
        current_stage: row['boxes.current_stage'],
        box_type: row['boxes.box_type'],
        lot: row['lots.lot_number'] ? { lot_number: row['lots.lot_number'] } : null
      }
    }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBookActivitiesByBookIds = async (bookIds) => {
  if (!bookIds || bookIds.length === 0) return { data: [], error: null };
  const placeholders = bookIds.map((_, i) => `$${i + 1}`).join(', ');
  
  try {
    const { rows } = await db.query(
      `SELECT book_id, scan_status FROM book_activity WHERE book_id IN (${placeholders})`, 
      bookIds
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateBookActivityTransmissionStatus = async (bookId, status) => {
  try {
    const { rows } = await db.query(
      'UPDATE book_activity SET transmission_status = $1 WHERE book_id = $2 RETURNING *',
      [status, bookId]
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getBookIdsByIsbns = async (isbns) => {
  if (!isbns || isbns.length === 0) return { data: [], error: null };
  const placeholders = isbns.map((_, i) => `$${i + 1}`).join(', ');
  
  try {
    const { rows } = await db.query(
      `SELECT id, isbn FROM books WHERE isbn IN (${placeholders})`, 
      isbns
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
