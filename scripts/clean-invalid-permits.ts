import 'dotenv/config';
import { query } from '../lib/db.js';

/**
 * Script to clean up permits with invalid "Unknown Unknown" data
 * This will delete permits where the deceased name is "Unknown Unknown"
 */

async function cleanInvalidPermits() {
  console.log('Checking for permits with invalid data...\n');
  
  try {
    // Find permits with "Unknown" names
    const invalidPermits = await query(`
      SELECT 
        id, 
        permit_id, 
        deceased_first_name, 
        deceased_last_name,
        status,
        created_at
      FROM pending_permits 
      WHERE 
        (deceased_first_name = 'Unknown' OR deceased_first_name IS NULL)
        OR (deceased_last_name = 'Unknown' OR deceased_last_name IS NULL)
      ORDER BY created_at DESC
    `);
    
    if (invalidPermits.length === 0) {
      console.log('✅ No invalid permits found. All permits have proper names.');
      process.exit(0);
    }
    
    console.log(`Found ${invalidPermits.length} permit(s) with invalid data:\n`);
    invalidPermits.forEach((permit: any) => {
      console.log(`  - ID: ${permit.id}, Permit ID: ${permit.permit_id}`);
      console.log(`    Name: ${permit.deceased_first_name || 'NULL'} ${permit.deceased_last_name || 'NULL'}`);
      console.log(`    Status: ${permit.status}`);
      console.log(`    Created: ${permit.created_at}\n`);
    });
    
    // Ask for confirmation (in a real scenario, you'd use readline or similar)
    console.log('🗑️  Deleting invalid permits...\n');
    
    const result = await query(`
      DELETE FROM pending_permits 
      WHERE 
        (deceased_first_name = 'Unknown' OR deceased_first_name IS NULL)
        OR (deceased_last_name = 'Unknown' OR deceased_last_name IS NULL)
    `);
    
    console.log(`✅ Deleted ${result.length || invalidPermits.length} invalid permit(s).\n`);
    console.log('You can now submit new permits with correct data using:');
    console.log('  npm run test:permit-submit\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanInvalidPermits();
