import { logger } from '../utils/logger.js'
/**
 * config/supabase.js
 *
 * Creates and exports two Supabase clients:
 *
 *   supabase      — Uses the public anon key. Subject to Row-Level Security (RLS).
 *                   Used for user-facing auth (login, register, token validation).
 *
 *   supabaseAdmin — Uses the service role key. Bypasses RLS entirely.
 *                   ONLY use this server-side for operations that legitimately
 *                   need to read/write across all users (e.g. warehouse ops,
 *                   pipeline automation, admin profile updates).
 *                   NEVER expose this client or its key to the frontend.
 *
 * Required environment variables (in root .env):
 *   NEXT_PUBLIC_SUPABASE_URL        — Project URL, e.g. https://xyz.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   — Public anon key (safe to expose in browser)
 *   SUPABASE_SERVICE_ROLE_KEY       — Secret service role key (server-only, never expose)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Resolve __dirname for ES modules (not available by default in ESM)
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

// Load .env from the backend directory (one level up from /backend/config/)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// ── Startup validation ────────────────────────────────────────────────────────
// Throw early if the minimum required variables are missing — better to crash
// at startup with a clear message than to fail silently on the first DB call.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env')
}

if (!supabaseServiceKey) {
  // Log a warning but don't crash — routes that need supabaseAdmin will handle
  // the null case individually and return appropriate errors.
  logger.error('⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY is missing in .env file!')
  logger.error('⚠️  Warehouse operations will fail without this key.')
  logger.error('⚠️  Get it from: Supabase Dashboard → Settings → API → service_role key')
}

// Log only whether each key is present — never log the actual key values
// (even the anon key, to avoid leaking project infrastructure details in logs)
logger.info('✅ Supabase URL loaded:        ', supabaseUrl ? 'Yes' : 'No')
logger.info('✅ Supabase Anon Key loaded:   ', supabaseAnonKey    ? 'Yes' : 'No')
logger.info('✅ Supabase Service Key loaded:', supabaseServiceKey ? 'Yes' : 'No')

// ── Client instances ──────────────────────────────────────────────────────────

/**
 * Public Supabase client.
 * Operates under Row-Level Security — users can only see/modify their own data.
 * Safe to use for auth flows and user-scoped queries.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Admin Supabase client (service role).
 * Bypasses RLS — can read and write ALL rows in ALL tables.
 * Will be null if SUPABASE_SERVICE_ROLE_KEY is not set; routes must handle this.
 * NEVER use this client in any code path that could be triggered by an
 * unauthenticated request.
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

if (!supabaseAdmin) {
  logger.error('❌ supabaseAdmin is NULL — warehouse and admin operations will not work!')
}
