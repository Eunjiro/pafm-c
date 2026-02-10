import 'dotenv/config';
import pool from '../lib/db';
import * as crypto from 'crypto';

function generateApiKey(): string {
  // Generate a secure random API key (32 bytes = 64 hex characters)
  return 'pk_' + crypto.randomBytes(32).toString('hex');
}

async function seedApiKey() {
  const client = await pool.connect();
  
  try {
    console.log('🔑 Generating API key for Permit System...');
    
    // Check if permit system key already exists
    const existing = await client.query(
      "SELECT * FROM api_keys WHERE system_name = 'permit_system' AND is_active = true"
    );
    
    if (existing.rows.length > 0) {
      console.log('\n⚠️  Active API key already exists for Permit System:');
      console.log(`   Key Name: ${existing.rows[0].key_name}`);
      console.log(`   API Key: ${existing.rows[0].api_key}`);
      console.log(`   Created: ${existing.rows[0].created_at}`);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      // Don't proceed in automated environments
      if (process.env.CI || !process.stdin.isTTY) {
        console.log('\n✅ Using existing API key');
        return;
      }
      
      const answer = await new Promise<string>((resolve) => {
        readline.question('\nGenerate a new one? (y/N): ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('✅ Keeping existing API key');
        return;
      }
      
      // Deactivate old key
      await client.query(
        "UPDATE api_keys SET is_active = false WHERE system_name = 'permit_system'"
      );
      console.log('🔒 Previous API key deactivated');
    }
    
    // Generate new API key
    const apiKey = generateApiKey();
    
    // Get admin user ID (first admin user)
    const admin = await client.query(
      "SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1"
    );
    
    const createdBy = admin.rows[0]?.id || null;
    
    // Insert new API key
    const result = await client.query(
      `INSERT INTO api_keys 
        (key_name, api_key, system_name, is_active, permissions, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        'Permit System API Key',
        apiKey,
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
    
    console.log('\n✅ API Key generated successfully!');
    console.log('\n' + '='.repeat(80));
    console.log('🔐 PERMIT SYSTEM API KEY (Save this securely!)');
    console.log('='.repeat(80));
    console.log(`\n${apiKey}\n`);
    console.log('='.repeat(80));
    
    console.log('\n📋 Key Details:');
    console.log(`   System: ${result.rows[0].system_name}`);
    console.log(`   Status: Active`);
    console.log(`   Permissions: Read & Write`);
    console.log(`   Created: ${result.rows[0].created_at}`);
    
    console.log('\n📝 Usage in Permit System:');
    console.log('   Add to request headers:');
    console.log(`   Authorization: Bearer ${apiKey}`);
    
    console.log('\n🔗 Available Endpoints:');
    console.log('   GET  /api/external/plots?available=true');
    console.log('   GET  /api/external/cemeteries');
    console.log('   POST /api/external/permits');
    console.log('   GET  /api/external/permits/:id');
    
    console.log('\n⚠️  Security Note:');
    console.log('   - Store this API key securely in environment variables');
    console.log('   - Never commit it to version control');
    console.log('   - Rotate keys periodically');
    console.log('   - Monitor usage via activity logs');
    
  } catch (error) {
    console.error('❌ Error generating API key:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedApiKey().catch(console.error);
