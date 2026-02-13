import 'dotenv/config';
import { query } from '../lib/db.js';

async function checkApiKeys() {
  try {
    console.log('Checking for active API keys...\n');
    
    const keys = await query(`
      SELECT 
        id, 
        key_name, 
        api_key,
        system_name, 
        is_active,
        created_at
      FROM api_keys 
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
    
    if (keys.length === 0) {
      console.log('❌ No active API keys found in database.\n');
      console.log('To create an API key, run:');
      console.log('  npm run db:seed:api-key\n');
      process.exit(1);
    }
    
    console.log(`✅ Found ${keys.length} active API key(s):\n`);
    keys.forEach((key: any) => {
      console.log(`Name: ${key.key_name}`);
      console.log(`System: ${key.system_name}`);
      console.log(`Key: ${key.api_key}`);
      console.log(`Created: ${key.created_at}`);
      console.log('---\n');
    });
    
    console.log('💡 To use this key, set the environment variable:');
    console.log(`  $env:PERMIT_API_KEY="${keys[0].api_key}" (PowerShell)`);
    console.log(`  set PERMIT_API_KEY=${keys[0].api_key} (CMD)\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkApiKeys();
