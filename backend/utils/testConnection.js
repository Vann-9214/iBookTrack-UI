import { supabase } from '../config/supabase.js'

export const testConnection = async () => {
  try {
    const { error } = await supabase.auth.getSession()
    if (error) throw error
    console.log('✅ Supabase connected successfully')
    return true
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message)
    return false
  }
}
