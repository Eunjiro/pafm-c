import 'dotenv/config';
import pool from '../lib/db';

async function registerPermitApiKey() {
  const client = await pool.connect();
  
  try {
    // The API key from the permit system
    const permitApiKey = 'pk_dec7b8a49db514e873ed6be76d9c7b9fe727320c9a25beeda71736192c222c53';
    
    console.log('🔑 Registering Permit System API key...');
    
    // Check if this API key already exists
    const existing = await client.query(
      "SELECT * FROM api_keys WHERE api_key = $1",
      [permitApiKey]
    );
    
    if (existing.rows.length > 0) {
      console.log('\n⚠️  API key already exists:');
      console.log(`   Key Name: ${existing.rows[0].key_name}`);
      console.log(`   System: ${existing.rows[0].system_name}`);
      console.log(`   Status: ${existing.rows[0].is_active ? 'Active ✅' : 'Inactive ❌'}`);
      console.log(`   Created: ${existing.rows[0].created_at}`);
      
      // If inactive, reactivate it
      if (!existing.rows[0].is_active) {
        await client.query(
          "UPDATE api_keys SET is_active = true WHERE api_key = $1",
          [permitApiKey]
        );
        console.log('\n✅ API key reactivated successfully!');
      } else {
        console.log('\n✅ API key is already active. No changes needed.');
      }
      return;
    }
    
    // Get admin user ID (first admin user)
    const admin = await client.query(
      "SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1"
    );
    
    const createdBy = admin.rows[0]?.id || null;
    
    // Insert the permit system's API key
    const result = await client.query(
      `INSERT INTO api_keys 
        (key_name, api_key, system_name, is_active, permissions, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        'Permit System - External Integration',
        permitApiKey,
        'permit_system',
        true,
        JSON.stringify({
          read: true,
          write: true,
          endpoints: [
            'GET /api/external/plots',
            'GET /api/external/cemeteries',
            'POST /api/external/permits',
            'GET /api/external/permits/:id'
          ]
        }),
        createdBy
      ]
    );
    
    console.log('\n✅ API Key registered successfully!');
    console.log('\n' + '='.repeat(80));
    console.log('🔐 PERMIT SYSTEM API KEY REGISTERED');
    console.log('='.repeat(80));
    console.log(`\nAPI Key: ${permitApiKey}`);
    console.log(`System: ${result.rows[0].system_name}`);
    console.log(`Status: Active ✅`);
    console.log(`Permissions: Read & Write`);
    console.log('\n📋 Allowed Endpoints:');
    console.log('   - GET /api/external/plots');
    console.log('   - GET /api/external/cemeteries');
    console.log('   - POST /api/external/permits');
    console.log('   - GET /api/external/permits/:id');
    console.log('\n' + '='.repeat(80));
    console.log('\n✨ The permit system can now send data to this cemetery system!');
    
  } catch (error) {
    console.error('❌ Error registering API key:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

registerPermitApiKey().catch(console.error);
