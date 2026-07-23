import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  try {
    const files = fs.readdirSync(migrationsDir)
                    .filter(f => f.endsWith('.sql'))
                    .sort(); // Run in alphabetical order (001, 002, 003...)

    console.log(`Found ${files.length} migration files. Executing...`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`Running: ${file}...`);
      await pool.query(sql);
      console.log(`✅ Success: ${file}`);
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigrations();
