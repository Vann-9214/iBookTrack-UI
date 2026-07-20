/**
 * repositories/auth.js
 *
 * Database access layer for authentication.
 * Wraps Supabase Auth and database operations for users and profiles.
 */

import { supabase, supabaseAdmin } from '../config/supabase.js';

export const getProfileById = async (userId) => {
  if (!supabaseAdmin || !userId) return null;
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('name, email')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data;
};

export const updateProfile = async (userId, name, email) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ name, email })
    .eq('id', userId)
    .select('name, email')
    .single();
  return { data, error };
};

export const signUp = async (email, password, name) => {
  return await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: undefined }
  });
};

export const signInWithPassword = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const refreshSession = async (refresh_token) => {
  return await supabase.auth.refreshSession({ refresh_token });
};

export const updateAuthUser = async (userId, email, name) => {
  return await supabaseAdmin.auth.admin.updateUserById(userId, {
    email,
    user_metadata: { name, full_name: name }
  });
};

export const updateAuthPassword = async (userId, password) => {
  return await supabaseAdmin.auth.admin.updateUserById(userId, { password });
};
