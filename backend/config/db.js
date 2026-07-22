import pkg from 'pg';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    logger.error('❌ DATABASE_URL is missing in .env file!');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
});

pool.on('connect', () => {
    // Only log the first connection setup if needed for debugging
});

pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

/**
 * A handy wrapper for pool.query so we don't have to call pool.query everywhere.
 * Usage:
 * const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email])
 */
export const db = {
    query: (text, params) => pool.query(text, params),
    
    // For transactions
    getClient: () => pool.connect(),
};

logger.info('✅ PostgreSQL Database pool initialized.');
