import 'dotenv/config';
import pool from '../lib/db';

async function addMapCoordinatesColumn() {
  console.log('Adding map_coordinates column to cemeteries table...');
  
  try {
    await pool.query(`
      ALTER TABLE cemeteries 
      ADD COLUMN IF NOT EXISTS map_coordinates JSONB
    `);
    
    console.log('✅ map_coordinates column added successfully!');
    
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addMapCoordinatesColumn();
