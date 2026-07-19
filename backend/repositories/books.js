/**
 * repositories/books.js
 *
 * Handles all direct database interactions for the books domain.
 * Contains raw Supabase queries for fetching, updating, and inserting book data.
 */

import { supabaseAdmin } from '../config/supabase.js';

export const getBooks = async (box_id) => {
  let query = supabaseAdmin.from('books').select('id, isbn, title, book_type, box_id').order('title', { ascending: true });
  if (box_id) query = query.eq('box_id', box_id);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getScanRecord = async (id) => {
  const { data, error } = await supabaseAdmin.from('book_activity').select('id, book_id, books(id, isbn, title, box_id)').eq('id', id).single();
  return { data, error };
};

export const getLatestActivity = async (book_id) => {
  const { data, error } = await supabaseAdmin.from('book_activity').select('id').eq('book_id', book_id).order('warehouse_scan_at', { ascending: false }).limit(1).single();
  return { data, error };
};

export const insertFlag = async (flagData) => {
  const { data, error } = await supabaseAdmin.from('user_flags').insert(flagData).select('id').single();
  return { data, error };
};

export const deleteFlag = async (book_activity_id) => {
  const { error } = await supabaseAdmin.from('user_flags').delete().eq('book_activity_id', book_activity_id);
  if (error) throw error;
};
