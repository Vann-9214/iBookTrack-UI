/**
 * repositories/storage.js
 *
 * Database access for storage operations.
 */

import { supabaseAdmin } from '../config/supabase.js';

export const getStorageLocationsWithAssignments = async () => {
  return await supabaseAdmin
    .from('storage_locations')
    .select(`
      id, rack_id, level, capacity,
      assignments:storage_assignments(
        id, status, assigned_at, assigned_by_name,
        box:boxes(
          id, box_number, total_expected_books, lot_id,
          lot:lots(lot_number),
          books:books(
            isbn, title,
            scans:book_activity(scan_status)
          )
        )
      )
    `)
    .order('rack_id', { ascending: true })
    .order('level', { ascending: true });
};

export const upsertStorageLocations = async (rows) => {
  return await supabaseAdmin
    .from('storage_locations')
    .upsert(rows, { onConflict: 'rack_id,level', ignoreDuplicates: true });
};

export const getStorageLocationsByIds = async (rackIds) => {
  return await supabaseAdmin
    .from('storage_locations')
    .select('id, rack_id, level, capacity')
    .in('rack_id', rackIds);
};

export const getStorageLocationById = async (id) => {
  return await supabaseAdmin
    .from('storage_locations')
    .select('capacity, assignments:storage_assignments(id), rack_id, level')
    .eq('id', id)
    .single();
};

export const updateStorageLocationCapacity = async (id, capacity) => {
  return await supabaseAdmin
    .from('storage_locations')
    .update({ capacity })
    .eq('id', id)
    .select('id, rack_id, level, capacity')
    .single();
};

export const deleteStorageLocation = async (id) => {
  return await supabaseAdmin
    .from('storage_locations')
    .delete()
    .eq('id', id);
};

export const getAssignedBoxIds = async () => {
  return await supabaseAdmin
    .from('storage_assignments')
    .select('box_id');
};

export const getScanStageBoxes = async (boxType, excludedBoxIds = []) => {
  let query = supabaseAdmin
    .from('boxes')
    .select(`
      id, box_number, total_expected_books, lot_id,
      lot:lots(lot_number),
      books:books(
        isbn, title,
        scans:book_activity(scan_status, transmission_status)
      )
    `)
    .eq('current_stage', 'scan')
    .order('created_at', { ascending: false });

  if (boxType) {
    query = query.eq('box_type', boxType.charAt(0).toUpperCase() + boxType.slice(1).toLowerCase());
  }
  if (excludedBoxIds.length > 0) {
    query = query.not('id', 'in', `(${excludedBoxIds.join(',')})`);
  }
  return await query;
};

export const getStorageAssignmentsByLocationId = async (locationId) => {
  return await supabaseAdmin
    .from('storage_assignments')
    .select('id')
    .eq('storage_location_id', locationId);
};

export const getStorageAssignmentsByBoxIds = async (boxIds) => {
  return await supabaseAdmin
    .from('storage_assignments')
    .select('box_id')
    .in('box_id', boxIds);
};

export const getBoxesByIds = async (boxIds) => {
  return await supabaseAdmin
    .from('boxes')
    .select('id, box_number, current_stage')
    .in('id', boxIds);
};

export const insertStorageAssignments = async (assignments) => {
  return await supabaseAdmin
    .from('storage_assignments')
    .insert(assignments)
    .select();
};

export const deleteStorageAssignments = async (assignmentIds) => {
  return await supabaseAdmin
    .from('storage_assignments')
    .delete()
    .in('id', assignmentIds)
    .select('box_id');
};

export const updateBoxesStage = async (boxIds, stage) => {
  return await supabaseAdmin
    .from('boxes')
    .update({ current_stage: stage })
    .in('id', boxIds);
};

export const searchBoxesByNumber = async (queryStr, boxType) => {
  let query = supabaseAdmin
    .from('boxes')
    .select('id, box_number')
    .ilike('box_number', queryStr)
    .limit(10);
  if (boxType) {
    query = query.eq('box_type', boxType.charAt(0).toUpperCase() + boxType.slice(1).toLowerCase());
  }
  return await query;
};

export const searchBookActivityByIsbn = async (queryStr) => {
  return await supabaseAdmin
    .from('book_activity')
    .select('book:books!inner(box_id, isbn, title)')
    .ilike('book.isbn', queryStr)
    .limit(10);
};

export const searchLotsByNumber = async (queryStr) => {
  return await supabaseAdmin
    .from('lots')
    .select('id, lot_number')
    .ilike('lot_number', queryStr)
    .limit(10);
};

export const searchBoxesByLotIds = async (lotIds, boxType) => {
  let query = supabaseAdmin
    .from('boxes')
    .select('id, box_number', { count: 'exact' })
    .in('lot_id', lotIds)
    .limit(10);
  if (boxType) {
    query = query.eq('box_type', boxType.charAt(0).toUpperCase() + boxType.slice(1).toLowerCase());
  }
  return await query;
};

export const getStorageAssignmentsForSearch = async (boxIds) => {
  return await supabaseAdmin
    .from('storage_assignments')
    .select(`
      id, status,
      box:boxes(id, box_number, lot:lots(lot_number)),
      location:storage_locations(id, rack_id, level)
    `)
    .in('box_id', Array.from(boxIds));
};

export const getPendingStorageAssignments = async (boxType) => {
  let query = supabaseAdmin
    .from('storage_assignments')
    .select(`
      id, status, assigned_at, assigned_by_name,
      box:boxes(id, box_number, total_expected_books, lot_id, box_type, lot:lots(lot_number)),
      location:storage_locations(id, rack_id, level)
    `)
    .eq('status', 'pending');

  if (boxType) {
    query = query.eq('box.box_type', boxType.charAt(0).toUpperCase() + boxType.slice(1).toLowerCase());
  }
  return await query.order('assigned_at', { ascending: false });
};

export const updateStorageAssignmentStatus = async (id, status) => {
  return await supabaseAdmin
    .from('storage_assignments')
    .update({ status })
    .eq('id', id)
    .select('id, status, box_id')
    .single();
};
