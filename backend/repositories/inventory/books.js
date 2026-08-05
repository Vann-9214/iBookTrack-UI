/**
 * repositories/books.js
 *
 * Handles all direct database interactions for the books domain.
 * Uses vanilla PostgreSQL queries.
 */

import { db } from '../../config/db.js';

export const getBooks = async (box_id) => {
  let query = 'SELECT id, isbn, title, author, book_type, box_id FROM books';
  const params = [];

  if (box_id) {
    query += ' WHERE box_id = $1';
    params.push(box_id);
  }

  query += ' ORDER BY title ASC';

  const { rows } = await db.query(query, params);
  return rows;
};

export const getScanRecord = async (id) => {
  const query = `
    SELECT 
      ba.id, 
      ba.book_id, 
      b.id as "books.id", 
      b.isbn as "books.isbn", 
      b.title as "books.title", 
      b.box_id as "books.box_id"
    FROM book_activity ba
    LEFT JOIN books b ON ba.book_id = b.id
    WHERE ba.id = $1
  `;
  try {
    const { rows } = await db.query(query, [id]);
    if (rows.length === 0) return { data: null, error: null };
    
    // Format to match old nested object style for the frontend/services
    const row = rows[0];
    const data = {
      id: row.id,
      book_id: row.book_id,
      books: {
        id: row['books.id'],
        isbn: row['books.isbn'],
        title: row['books.title'],
        box_id: row['books.box_id']
      }
    };
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getLatestActivity = async (book_id) => {
  try {
    const { rows } = await db.query(
      'SELECT id FROM book_activity WHERE book_id = $1 ORDER BY warehouse_scan_at DESC LIMIT 1',
      [book_id]
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const insertFlag = async (flagData) => {
  // Extract keys and values from the flagData object dynamically
  const keys = Object.keys(flagData);
  const values = Object.values(flagData);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const query = `
    INSERT INTO user_flags (${keys.join(', ')})
    VALUES (${placeholders})
    RETURNING id
  `;

  try {
    const { rows } = await db.query(query, values);
    return { data: rows[0], error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteFlag = async (book_activity_id) => {
  await db.query('DELETE FROM user_flags WHERE book_activity_id = $1', [book_activity_id]);
};

export const insertMismatchInfo = async (mismatchData) => {
  const { book_id, ilms_title, ilms_author, physical_title, physical_author, created_by } = mismatchData;
  const query = `
    INSERT INTO mismatch_info (book_id, ilms_title, ilms_author, physical_title, physical_author, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  await db.query(query, [book_id, ilms_title, ilms_author || null, physical_title, physical_author || null, created_by]);
};

export const markBookAsMismatch = async (book_id) => {
  await db.query('UPDATE books SET is_mismatch = true WHERE id = $1', [book_id]);
};
