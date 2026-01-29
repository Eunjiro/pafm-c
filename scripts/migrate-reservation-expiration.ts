import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Try .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'cemetery_db',
  ssl: process.env.POSTGRES_URL ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  console.log('🔄 Running reservation and expiration migration...');

  try {
    const sqlPath = path.join(__dirname, '..', 'database', 'add-reservation-and-expiration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('📋 Added columns:');
    console.log('   - grave_plots: reserved_by, reserved_date, reservation_expiry, reservation_notes');
    console.log('   - burials: expiration_date, renewal_date, is_expired');
    console.log('📊 Created indexes for performance');
    console.log('🔧 Created triggers for automatic plot status updates');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
