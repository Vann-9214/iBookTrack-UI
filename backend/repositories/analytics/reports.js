/**
 * repositories/reports.js
 *
 * Database access layer for report generation.
 * Uses vanilla PostgreSQL queries.
 */

import { db } from '../../config/db.js';

export const getLots = async (brandType) => {
  let query = 'SELECT id, lot_number, type, created_at, total_boxes FROM lots';
  const params = [];
  if (brandType) {
    query += ' WHERE type = $1';
    params.push(brandType);
  }
  query += ' ORDER BY created_at DESC';

  try {
    const { rows } = await db.query(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

export const getAllBoxesWithSessions = async () => {
  const query = `
    SELECT 
      b.id, b.lot_id, b.current_stage, b.box_number, b.total_expected_books,
      (
        SELECT json_agg(json_build_object(
          'status', bs.status,
          'warehouse_time_received', bs.warehouse_time_received,
          'inventory_time_received', bs.inventory_time_received,
          'cut_time_received', bs.cut_time_received,
          'endorsement_time_received', bs.endorsement_time_received,
          'scan_time_received', bs.scan_time_received,
          'updated_at', bs.updated_at
        ))
        FROM box_sessions bs WHERE bs.box_id = b.id
      ) as box_sessions
    FROM boxes b
  `;
  try {
    const { rows } = await db.query(query);
    return rows.map(r => ({
      ...r,
      box_sessions: r.box_sessions || []
    }));
  } catch (error) {
    throw error;
  }
};

export const getAllScans = async () => {
  const query = `
    SELECT 
      ba.scan_status, 
      ba.transmission_status, 
      ba.warehouse_scan_at, 
      ba.inventory_scan_at, 
      ba.endorsement_scan_at, 
      b.isbn as "books.isbn", 
      b.box_id as "books.box_id"
    FROM book_activity ba
    JOIN books b ON ba.book_id = b.id
  `;
  try {
    const { rows } = await db.query(query);
    return rows.map(r => ({
      scan_status: r.scan_status,
      transmission_status: r.transmission_status,
      warehouse_scan_at: r.warehouse_scan_at,
      inventory_scan_at: r.inventory_scan_at,
      endorsement_scan_at: r.endorsement_scan_at,
      books: { isbn: r['books.isbn'], box_id: r['books.box_id'] }
    }));
  } catch (error) {
    throw error;
  }
};
