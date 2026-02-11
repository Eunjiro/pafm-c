import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import pool from '../lib/db';

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Adding layer and permit_number columns to burials table...');
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'database', 'add-burial-permit-columns.sql');
    const migration = readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    await client.query(migration);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify columns were added
    const checkColumns = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'burials' 
      AND column_name IN ('layer', 'permit_number')
      ORDER BY column_name;
    `);
    
    console.log('\n📋 Columns added:');
    checkColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})${col.column_default ? ' DEFAULT: ' + col.column_default : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
