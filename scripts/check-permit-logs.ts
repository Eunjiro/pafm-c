import 'dotenv/config';
import pool from '../lib/db';

async function checkRecentLogs() {
  const client = await pool.connect();
  
  try {
    console.log('📋 Checking recent API activity...\n');
    
    // Check for recent permit-related logs
    const logs = await client.query(`
      SELECT 
        id,
        action,
        description,
        resource_type,
        status,
        created_at
      FROM system_logs
      WHERE action LIKE '%permit%' OR resource_type = 'permit'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (logs.rows.length === 0) {
      console.log('⚠️  No permit-related logs found\n');
    } else {
      console.log(`✅ Found ${logs.rows.length} recent permit logs:\n`);
      logs.rows.forEach((log, i) => {
        console.log(`${i + 1}. [${log.status}] ${log.action}`);
        console.log(`   ${log.description}`);
        console.log(`   Time: ${log.created_at}`);
        console.log('');
      });
    }
    
    // Check pending permits table for validation errors
    console.log('📋 Checking for recent pending permits...\n');
    const permits = await client.query(`
      SELECT 
        id,
        permit_id,
        permit_type,
        deceased_first_name,
        deceased_last_name,
        applicant_name,
        status,
        created_at
      FROM pending_permits
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (permits.rows.length === 0) {
      console.log('⚠️  No pending permits found\n');
    } else {
      console.log(`✅ Found ${permits.rows.length} pending permits:\n`);
      permits.rows.forEach((permit, i) => {
        console.log(`${i + 1}. ID: ${permit.permit_id}`);
        console.log(`   Deceased: ${permit.deceased_first_name} ${permit.deceased_last_name}`);
        console.log(`   Type: ${permit.permit_type}`);
        console.log(`   Status: ${permit.status}`);
        console.log(`   Created: ${permit.created_at}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkRecentLogs();
