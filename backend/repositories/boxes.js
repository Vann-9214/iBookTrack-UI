/**
 * repositories/boxes.js
 *
 * Database access for boxes operations.
 */

import { supabaseAdmin } from '../config/supabase.js';

export const getBoxTypeById = async (id) => {
  return await supabaseAdmin.from('boxes').select('box_type').eq('id', id).single();
};

export const getBookActivityForSync = async (boxId) => {
  return await supabaseAdmin
    .from('book_activity')
    .select('book_id, books!inner(isbn, box_id)')
    .eq('books.box_id', boxId)
    .eq('scan_status', 'processable');
};

export const updateTransmissionStatus = async (bookId, status) => {
  return await supabaseAdmin
    .from('book_activity')
    .update({ transmission_status: status })
    .eq('book_id', bookId);
};

export const searchBooksByIsbn = async (isbn) => {
  return await supabaseAdmin
    .from('books')
    .select('box_id')
    .ilike('isbn', `%${isbn}%`);
};

export const getBoxesBaseQuery = (lot_id, box_type, current_stage, box_number, isbnBoxIds) => {
  let query = supabaseAdmin
    .from('boxes')
    .select(`
      *,
      lot:lots(lot_number, type),
      box_sessions(
        id, status, updated_at, total_scanned_books, total_processable_books,
        warehouse_user_received, inventory_user_received, endorsement_user_received, inventory_user_send, 
        warehouse_time_received, inventory_time_received, inventory_time_send, 
        cut_time_received, cut_time_send, endorsement_time_received, endorsement_time_send, scan_time_received,
        warehouse_received_profile:profiles!warehouse_sessions_received_by_fkey(name),
        inventory_received_profile:profiles!box_sessions_inventory_user_received_fkey(name),
        inventory_send_profile:profiles!box_sessions_inventory_user_scan_fkey(name),
        cut_received_profile:profiles!box_sessions_cut_user_received_fkey(name),
        cut_send_profile:profiles!box_sessions_cut_user_send_fkey(name),
        endorsement_received_profile:profiles!box_sessions_endorsement_user_received_fkey(name),
        endorsement_send_profile:profiles!box_sessions_endorsement_user_send_fkey(name),
        scan_received_profile:profiles!box_sessions_scan_user_received_fkey(name)
      )
    `)
    .order('created_at', { ascending: false });

  if (lot_id) query = query.eq('lot_id', lot_id);
  if (box_type) query = query.eq('box_type', box_type.charAt(0).toUpperCase() + box_type.slice(1).toLowerCase());
  if (current_stage) {
    if (current_stage.includes(',')) {
      query = query.in('current_stage', current_stage.split(','));
    } else {
      query = query.eq('current_stage', current_stage);
    }
  }
  if (box_number) query = query.ilike('box_number', `%${box_number}%`);
  if (isbnBoxIds) {
    query = query.in('id', isbnBoxIds);
  }
  return query;
};

export const getBooksForBoxes = async (boxIds) => {
  return await supabaseAdmin.from('books').select('id, box_id').in('box_id', boxIds);
};

export const getInventoryScans = async (bookIds) => {
  return await supabaseAdmin.from('book_activity')
    .select('inventory_scan_at, inventory_scan_by, book_id')
    .in('book_id', bookIds)
    .not('inventory_scan_at', 'is', null)
    .order('inventory_scan_at', { ascending: false });
};

export const getEndorsementScans = async (bookIds) => {
  return await supabaseAdmin.from('book_activity')
    .select('endorsement_scan_at, endorsement_scan_by, book_id')
    .in('book_id', bookIds)
    .not('endorsement_scan_at', 'is', null)
    .order('endorsement_scan_at', { ascending: false });
};

export const getProfilesByIds = async (userIds) => {
  return await supabaseAdmin.from('profiles').select('id, name, email').in('id', userIds);
};

export const getScanActivities = async (scanBoxIds) => {
  return await supabaseAdmin.from('book_activity')
    .select('book_id, transmission_status, books!inner(box_id)')
    .in('books.box_id', scanBoxIds)
    .eq('scan_status', 'processable');
};

export const getAssignedStorageBoxIds = async () => {
  return await supabaseAdmin.from('storage_assignments').select('box_id');
};

export const getLotsBySearch = async (safeSearch) => {
  return await supabaseAdmin.from('lots').select('id').ilike('lot_number', `%${safeSearch}%`);
};

export const getPipelineTransitionsQuery = (limitNum, offsetNum, stage, box_type, search, date_from, date_to, lotIds) => {
  let boxSelect = `id, box_number, created_at, lot:lots(lot_number), box_type, current_stage, total_expected_books, total_transmitted_books, books(title)`;
  let query = supabaseAdmin
    .from('box_sessions')
    .select(`
      id,
      warehouse_time_received, warehouse_user_received,
      inventory_time_received, inventory_user_received,
      inventory_time_send, inventory_user_send,
      cut_time_received, cut_user_received,
      cut_time_send, cut_user_send,
      endorsement_time_received, endorsement_user_received,
      endorsement_time_send, endorsement_user_send,
      scan_time_received, scan_user_received,
      total_scanned_books, total_processable_books,
      updated_at,
      box:boxes!inner(${boxSelect})
    `, { count: 'exact' });

  if (box_type) query = query.eq('boxes.box_type', box_type.charAt(0).toUpperCase() + box_type.slice(1).toLowerCase());
  if (stage && stage !== 'all') query = query.eq('boxes.current_stage', stage);
  if (date_from) query = query.gte('updated_at', `${date_from}T00:00:00.000Z`);
  if (date_to) query = query.lte('updated_at', `${date_to}T23:59:59.999Z`);
  
  if (search) {
    if (lotIds && lotIds.length > 0) {
      query = query.or(`box_number.ilike.%${search}%,lot_id.in.(${lotIds.join(',')})`, { foreignTable: 'boxes' });
    } else {
      query = query.ilike('boxes.box_number', `%${search}%`);
    }
  }

  return query.order('updated_at', { ascending: false }).range(offsetNum, offsetNum + limitNum - 1);
};

export const getBookActivitiesForPipeline = async (boxIds) => {
  return await supabaseAdmin.from('book_activity')
    .select('warehouse_scan_by, warehouse_scan_at, inventory_scan_by, inventory_scan_at, endorsement_scan_by, endorsement_scan_at, books!inner(box_id)')
    .in('books.box_id', boxIds);
};

export const getStorageAssignmentsForPipeline = async (boxIds) => {
  return await supabaseAdmin.from('storage_assignments')
    .select('box_id, assigned_by, assigned_at')
    .in('box_id', boxIds);
};

export const getBoxByNumber = async (boxNumber) => {
  return await supabaseAdmin.from('boxes')
    .select(`*, lot:lots(lot_number, type)`)
    .ilike('box_number', boxNumber)
    .maybeSingle();
};

export const getBookActivityForBox = async (boxId) => {
  return await supabaseAdmin.from('book_activity')
    .select('id, scan_status, warehouse_scan_at, transmission_status, books!inner(isbn, title, box_id, book_type)')
    .eq('books.box_id', boxId)
    .order('warehouse_scan_at', { ascending: true });
};

export const getBoxById = async (id) => {
  return await supabaseAdmin.from('boxes')
    .select(`*, lot:lots(lot_number, type)`)
    .eq('id', id)
    .single();
};

export const getBookActivityWithFlags = async (boxId) => {
  return await supabaseAdmin.from('book_activity')
    .select('id, scan_status, warehouse_scan_at, transmission_status, user_flags(rejection_reason, notes), books!inner(isbn, title, box_id)')
    .eq('books.box_id', boxId)
    .order('warehouse_scan_at', { ascending: true });
};

export const searchLotByCandidate = async (candidate) => {
  return await supabaseAdmin.from('lots')
    .select('id, lot_number')
    .ilike('lot_number', candidate)
    .maybeSingle();
};

export const getBoxesByLotId = async (lotId) => {
  return await supabaseAdmin.from('boxes')
    .select(`*, books:books(count)`)
    .eq('lot_id', lotId)
    .order('box_number');
};

export const updateBoxStage = async (id, stage) => {
  return await supabaseAdmin.from('boxes').update({ current_stage: stage }).eq('id', id).select().single();
};

export const updateBoxReceived = async (id) => {
  return await supabaseAdmin.from('boxes').update({ updated_at: new Date().toISOString() }).eq('id', id).select().single();
};

export const getLatestActiveSession = async (boxId) => {
  return await supabaseAdmin.from('box_sessions')
    .select('id, status')
    .eq('box_id', boxId)
    .in('status', ['completed', 'received'])
    .order('warehouse_time_received', { ascending: false })
    .limit(1)
    .maybeSingle();
};

export const updateSession = async (sessionId, updates) => {
  return await supabaseAdmin.from('box_sessions').update(updates).eq('id', sessionId);
};

export const getProcessableBooksForBox = async (boxId) => {
  return await supabaseAdmin.from('book_activity')
    .select('books!inner(isbn, box_id)')
    .eq('books.box_id', boxId)
    .eq('scan_status', 'processable');
};

export const updateSessionToReceived = async (boxId, userId, nextStage) => {
  if (nextStage === 'inventory') {
    return await supabaseAdmin.from('box_sessions')
      .update({ status: 'received', inventory_user_received: userId, inventory_time_received: new Date().toISOString() })
      .eq('box_id', boxId)
      .eq('status', 'completed');
  }
};

export const getSessionForAdvance = async (boxId) => {
  return await supabaseAdmin.from('box_sessions')
    .select('id, status')
    .eq('box_id', boxId)
    .order('warehouse_time_received', { ascending: false })
    .limit(1)
    .maybeSingle();
};

export const deleteBooks = async (boxId) => {
  const { data: booksToDelete } = await supabaseAdmin.from('books').select('id').eq('box_id', boxId);
  if (booksToDelete && booksToDelete.length > 0) {
    await supabaseAdmin.from('book_activity').delete().in('book_id', booksToDelete.map(b => b.id));
    await supabaseAdmin.from('books').delete().in('id', booksToDelete.map(b => b.id));
  }
};

export const deleteStorageAssignments = async (boxId) => {
  return await supabaseAdmin.from('storage_assignments').delete().eq('box_id', boxId);
};

export const deleteBox = async (boxId) => {
  return await supabaseAdmin.from('boxes').delete().eq('id', boxId);
};
