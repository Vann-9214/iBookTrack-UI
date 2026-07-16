import { logger } from './logger.js'
/**
 * utils/testConnection.js
 *
 * Simple startup utility that pings Supabase to confirm the backend can
 * reach the database before serving traffic.
 *
 * Called once from server.js immediately after the HTTP server starts.
 * Logs a success or failure message to the console; does NOT crash the
 * process on failure so the server can still start in degraded mode.
 */

import { supabase } from '../config/supabase.js'

/**
 * Attempt a lightweight Supabase request (getSession) to verify connectivity.
 *
 * @returns {Promise<boolean>} true if connected, false if the request failed
 */
export const testConnection = async () => {
  try {
    // getSession is a low-cost auth call — it doesn't hit any user tables
    const { error } = await supabase.auth.getSession()
    if (error) throw error
    logger.info('✅ Supabase connected successfully')
    return true
  } catch (err) {
    logger.error('❌ Supabase connection failed:', err.message)
    return false
  }
}
