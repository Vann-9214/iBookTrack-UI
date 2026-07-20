/**
 * repositories/scanning.js
 *
 * Database access for scanning-related operations.
 * Isolates Supabase queries from the business logic.
 */

import { supabaseAdmin } from '../config/supabase.js';

export const getBooksByIsbns = async (isbns) => {
  return await supabaseAdmin
    .from('books')
    .select('isbn, box:boxes(box_number, lot:lots(lot_number))')
    .in('isbn', isbns);
};

export const getTransmitBooksByIsbnsAndType = async (isbns, boxType) => {
  return await supabaseAdmin
    .from('books')
    .select('id, isbn, title, boxes!inner(box_number, current_stage, box_type, lot:lots(lot_number))')
    .in('isbn', isbns)
    .eq('boxes.current_stage', 'scan')
    .eq('boxes.box_type', boxType);
};

export const getBookActivitiesByBookIds = async (bookIds) => {
  return await supabaseAdmin
    .from('book_activity')
    .select('book_id, scan_status')
    .in('book_id', bookIds);
};

export const updateBookActivityTransmissionStatus = async (bookId, status) => {
  return await supabaseAdmin
    .from('book_activity')
    .update({ transmission_status: status })
    .eq('book_id', bookId);
};

export const getBookIdsByIsbns = async (isbns) => {
  return await supabaseAdmin
    .from('books')
    .select('id, isbn')
    .in('isbn', isbns);
};
