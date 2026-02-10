import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '../lib/db';
import pool from '../lib/db';

async function migrateLogs() {
  try {
    console.log('Starting system logs migration...');

    const schemaPath = join(process.cwd(), 'database', 'logs-schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    await query(schema);

    console.log('✓ System logs table created successfully');
    console.log('✓ Indexes created successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateLogs();
