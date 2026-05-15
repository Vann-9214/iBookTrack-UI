import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env')
}

if (!supabaseServiceKey) {
  console.error('⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY is missing in .env file!')
  console.error('⚠️  Warehouse operations will fail without this key.')
  console.error('⚠️  Get it from: Supabase Dashboard → Settings → API → service_role key')
}

console.log('✅ Supabase URL:', supabaseUrl)
console.log('✅ Anon Key loaded:', supabaseAnonKey ? 'Yes' : 'No')
console.log('✅ Service Key loaded:', supabaseServiceKey ? 'Yes' : 'No')

// Public client — used for auth (login, register)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client — bypasses RLS, only use server-side
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

if (!supabaseAdmin) {
  console.error('❌ supabaseAdmin is NULL - warehouse operations will not work!')
}
