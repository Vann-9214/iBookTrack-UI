import { logger } from './logger.js'
import { db } from '../config/db.js'

export const testConnection = async () => {
  try {
    await db.query('SELECT 1')
    logger.info('✅ PostgreSQL connected successfully')
    return true
  } catch (err) {
    logger.error('❌ PostgreSQL connection failed:', err.message)
    return false
  }
}
