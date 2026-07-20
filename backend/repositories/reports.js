/**
 * repositories/reports.js
 *
 * Database access layer for report generation.
 */

import { supabaseAdmin } from '../config/supabase.js';

export const getLots = async (brandType) => {
  let query = supabaseAdmin
    .from('lots')
    .select('id, lot_number, type, created_at, total_boxes')
    .order('created_at', { ascending: false });
    
  if (brandType) query = query.eq('type', brandType);
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getAllBoxesWithSessions = async () => {
  const { data, error } = await supabaseAdmin
    .from('boxes')
    .select('id, lot_id, current_stage, box_number, total_expected_books, box_sessions(status, warehouse_time_received, inventory_time_received, cut_time_received, endorsement_time_received, scan_time_received, updated_at)');
    
  if (error) throw error;
  return data || [];
};

export const getAllScans = async () => {
  const { data, error } = await supabaseAdmin
    .from('book_activity')
    .select('scan_status, transmission_status, warehouse_scan_at, inventory_scan_at, endorsement_scan_at, books!inner(isbn, box_id)');
    
  if (error) throw error;
  return data || [];
};
