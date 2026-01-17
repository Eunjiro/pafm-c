import 'dotenv/config';
import { query } from '../lib/db';

async function addLayerColumn() {
  try {
    console.log('Adding layer column to grave_plots table...');
    
    await query(`
      ALTER TABLE grave_plots 
      ADD COLUMN IF NOT EXISTS layer INTEGER DEFAULT 1;
    `);
    
    console.log('✓ Layer column added successfully');
    console.log('✓ Default layer is set to 1 (ground level)');
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding layer column:', error);
    process.exit(1);
  }
}

addLayerColumn();
