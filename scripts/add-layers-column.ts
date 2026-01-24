import 'dotenv/config';
import pool from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function addLayersColumn() {
  try {
    console.log('📋 Adding layers column to grave_plots table...');

    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'add-layers-column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    await pool.query(sql);

    console.log('✅ Layers column added successfully!');

    // Verify the column exists
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'grave_plots' AND column_name = 'layers'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: layers column exists');
      console.log('   Type:', result.rows[0].data_type);
      console.log('   Default:', result.rows[0].column_default);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding layers column:', error);
    process.exit(1);
  }
}

addLayersColumn();
