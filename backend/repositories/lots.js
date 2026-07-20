/**
 * repositories/lots.js
 *
 * Database access layer for lots.
 * Contains all raw Supabase queries for fetching lots, counting lots,
 * and retrieving related boxes and scans. Keeps DB logic out of services.
 */

import { supabase, supabaseAdmin } from '../config/supabase.js';

export const getLotsCount = async (search, lotType) => {
  const db = supabaseAdmin || supabase;
  let countQuery = db.from('lots').select('*', { count: 'exact', head: true });
  if (search) countQuery = countQuery.ilike('lot_number', `%${search}%`);
  if (lotType) countQuery = countQuery.eq('type', lotType);
  const { count } = await countQuery;
  return count;
};

export const getLotsList = async (offset, limit, search, lotType) => {
  const db = supabaseAdmin || supabase;
  let query = db
    .from('lots')
    .select(`
      id, lot_number, total_boxes, type, created_at,
      boxes:boxes(count)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.ilike('lot_number', `%${search}%`);
  if (lotType) query = query.eq('type', lotType);

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getLotByNumberOrLatest = async (lot_number, lotType) => {
  const db = supabaseAdmin || supabase;
  let lotQuery = db.from('lots').select('id, lot_number, type');
  if (lotType) lotQuery = lotQuery.eq('type', lotType);
  
  if (lot_number.toLowerCase() === 'latest') {
    lotQuery = lotQuery.order('created_at', { ascending: false }).limit(1).single();
  } else {
    lotQuery = lotQuery.ilike('lot_number', lot_number).maybeSingle();
  }
  
  const { data, error } = await lotQuery;
  return { data, error };
};

export const getLotBoxes = async (lot_id) => {
  const db = supabaseAdmin || supabase;
  const { data } = await db.from('boxes').select('id').eq('lot_id', lot_id);
  return data || [];
};

export const getBookActivitiesForBoxes = async (boxIds) => {
  const db = supabaseAdmin || supabase;
  const { data, error } = await db
    .from('book_activity')
    .select('id, scan_status, user_flags(rejection_reason), warehouse_scan_at, books!inner(isbn, title, box_id, boxes(box_number, current_stage))')
    .in('books.box_id', boxIds)
    .order('warehouse_scan_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getLotWithBoxesByNumber = async (lot_number) => {
  const { data, error } = await supabase
    .from('lots')
    .select(`
      *,
      boxes:boxes(*)
    `)
    .eq('lot_number', lot_number)
    .single();
  if (error) throw error;
  return data;
};
