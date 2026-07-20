/**
 * repositories/warehouse.js
 *
 * The database access layer (Stockroom).
 * Isolates raw Supabase/SQL queries so the rest of the app doesn't need to worry about the database.
 */

import { supabaseAdmin } from '../config/supabase.js';

/**
 * Retrieves a lot by its lot_number.
 * @param {string} lotNumber 
 * @returns {Promise<{data: Object, error: Object}>}
 */
export const getLotByNumber = async (lotNumber) => {
  return await supabaseAdmin
    .from('lots')
    .select('*')
    .eq('lot_number', lotNumber)
    .single();
};

/**
 * Creates a new lot.
 * @param {Object} lotData 
 * @returns {Promise<{data: Object, error: Object}>}
 */
export const createLot = async (lotData) => {
  return await supabaseAdmin
    .from('lots')
    .insert(lotData)
    .select()
    .single();
};

/**
 * Retrieves a box by its ID.
 * @param {string} boxId 
 * @returns {Promise<{data: Object, error: Object}>}
 */
export const getBoxById = async (boxId) => {
  return await supabaseAdmin
    .from('boxes')
    .select('id, lot_id')
    .eq('id', boxId)
    .single();
};

/**
 * Retrieves a box by its box_number and associated lot_id.
 * @param {string} boxNumber 
 * @param {string} lotId 
 * @returns {Promise<{data: Object, error: Object}>}
 */
export const getBoxByNumberAndLot = async (boxNumber, lotId) => {
  return await supabaseAdmin
    .from('boxes')
    .select('id, total_expected_books, current_stage')
    .eq('lot_id', lotId)
    .eq('box_number', boxNumber)
    .maybeSingle();
};

/**
 * Creates a new box.
 * @param {Object} boxData 
 * @returns {Promise<{data: Object, error: Object}>}
 */
export const createBox = async (boxData) => {
  return await supabaseAdmin
    .from('boxes')
    .insert(boxData)
    .select()
    .single();
};

/**
 * Creates a new warehouse box session.
 * @param {Object} sessionData 
 * @returns {Promise<{data: Object, error: Object}>}
 */
export const createBoxSession = async (sessionData) => {
  return await supabaseAdmin
    .from('box_sessions')
    .insert(sessionData)
    .select()
    .single();
};
