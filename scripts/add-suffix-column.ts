import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

async function migrate() {
  try {
    console.log('Adding suffix column to deceased_persons table...');
    await pool.query(`ALTER TABLE deceased_persons ADD COLUMN IF NOT EXISTS suffix VARCHAR(20)`);
    console.log('✅ suffix column added successfully');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

migrate();
