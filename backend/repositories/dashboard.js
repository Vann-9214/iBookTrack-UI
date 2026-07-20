/**
 * repositories/dashboard.js
 *
 * Database access for dashboard statistics and aggregations.
 */

import { supabaseAdmin } from '../config/supabase.js';

export const getLotByNumber = async (lotNumber) => {
  return await supabaseAdmin
    .from('lots')
    .select('id')
    .eq('lot_number', lotNumber)
    .single();
};

export const getLotsInRange = async (start, end) => {
  return await supabaseAdmin
    .from('lots')
    .select('id')
    .gte('lot_number', start)
    .lte('lot_number', end);
};

export const countBoxes = async (lotIds, boxType) => {
  let query = supabaseAdmin.from('boxes').select('id', { count: 'exact', head: true });
  if (lotIds) query = query.in('lot_id', lotIds);
  if (boxType) query = query.eq('box_type', boxType);
  return await query;
};

export const countBooks = async (lotIds, boxType) => {
  let bookQuery = supabaseAdmin.from('books').select('id', { count: 'exact', head: true });
  
  let boxesFilterQuery = supabaseAdmin.from('boxes').select('id');
  if (lotIds) boxesFilterQuery = boxesFilterQuery.in('lot_id', lotIds);
  if (boxType) boxesFilterQuery = boxesFilterQuery.eq('box_type', boxType);
  
  if (lotIds || boxType) {
    const { data: boxes } = await boxesFilterQuery;
    if (boxes && boxes.length > 0) {
      bookQuery = bookQuery.in('box_id', boxes.map(b => b.id));
    } else {
      bookQuery = bookQuery.eq('id', '00000000-0000-0000-0000-000000000000');
    }
  }
  return await bookQuery;
};

export const countUnaccountedBooks = async (startIso, endIso, boxType) => {
  let query = supabaseAdmin
    .from('user_flags')
    .select(`
      id,
      book_activity!inner(
        books!inner(
          boxes!inner(
            box_type
          )
        )
      )
    `, { count: 'exact', head: true })
    .or(`and(warehouse_flag_at.gte.${startIso},warehouse_flag_at.lt.${endIso}),and(inventory_flag_at.gte.${startIso},inventory_flag_at.lt.${endIso}),and(endorsement_flag_at.gte.${startIso},endorsement_flag_at.lt.${endIso})`);

  if (boxType) {
    query = query.eq('book_activity.books.boxes.box_type', boxType);
  }
  return await query;
};

export const getAllLotsWithBoxes = async () => {
  return await supabaseAdmin
    .from('lots')
    .select('id, type, boxes(current_stage)');
};

export const getOpenLots = async (brand) => {
  let query = supabaseAdmin
    .from('lots')
    .select(`
      id, lot_number, type,
      boxes (
        id, current_stage, total_expected_books, total_transmitted_books
      )
    `)
    .order('created_at', { ascending: false });

  if (brand) {
    query = query.eq('type', brand);
  }
  return await query;
};

export const getQcFlags = async (page, limit, boxType, startIso, endIso) => {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabaseAdmin
    .from('user_flags')
    .select(`
      id, book_activity_id, rejection_reason, notes,
      warehouse_flag_by, warehouse_flag_at,
      inventory_flag_by, inventory_flag_at,
      endorsement_flag_by, endorsement_flag_at,
      warehouse_user:profiles!warehouse_flag_by(name),
      inventory_user:profiles!inventory_flag_by(name),
      endorsement_user:profiles!endorsement_flag_by(name),
      book_activity(
        id,
        books(
          isbn, title,
          boxes(
            box_number, box_type, lot:lots(lot_number)
          )
        )
      )
    `, { count: 'exact' });

  if (boxType) {
    query = query.eq('book_activity.books.boxes.box_type', boxType);
  } else {
    query = query.in('book_activity.books.boxes.box_type', ['Mustang', 'Jaguar']);
  }

  if (startIso && endIso) {
    query = query.or(`and(warehouse_flag_at.gte.${startIso},warehouse_flag_at.lt.${endIso}),and(inventory_flag_at.gte.${startIso},inventory_flag_at.lt.${endIso}),and(endorsement_flag_at.gte.${startIso},endorsement_flag_at.lt.${endIso})`);
  }

  return await query.order('warehouse_flag_at', { ascending: false }).range(start, end);
};

export const getBooksByIsbnsWithLots = async (isbns) => {
  return await supabaseAdmin
    .from('books')
    .select('isbn, title, box:boxes(box_number, lot:lots(lot_number))')
    .in('isbn', isbns);
};

export const searchLotByCandidate = async (candidate) => {
  return await supabaseAdmin
    .from('lots')
    .select('id, lot_number, type')
    .ilike('lot_number', candidate)
    .maybeSingle();
};

export const getBoxesByLotId = async (lotId) => {
  return await supabaseAdmin
    .from('boxes')
    .select('id, current_stage, total_expected_books, books:books(count)')
    .eq('lot_id', lotId)
    .order('box_number');
};

export const getBookActivitiesByBoxIds = async (boxIds) => {
  return await supabaseAdmin
    .from('book_activity')
    .select('scan_status, books!inner(box_id)')
    .in('books.box_id', boxIds);
};

export const getProcessedBoxesToday = async (startIso, endIso, lotId, brand) => {
  let query = supabaseAdmin
    .from('boxes')
    .select('id, current_stage, box_type, total_expected_books, box_sessions!inner(id)')
    .gte('box_sessions.updated_at', startIso)
    .lt('box_sessions.updated_at', endIso);

  if (lotId) query = query.eq('lot_id', lotId);
  if (brand) query = query.eq('box_type', brand);

  return await query;
};

export const getProcessableBookActivitiesForBoxes = async (boxIds) => {
  return await supabaseAdmin
    .from('book_activity')
    .select('book_id, scan_status, books!inner(isbn, box_id)')
    .in('books.box_id', boxIds)
    .eq('scan_status', 'processable');
};
