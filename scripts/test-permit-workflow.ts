/**
 * Complete permit testing workflow
 * Checks prerequisites and guides you through testing
 */

import 'dotenv/config';
import { query } from '../lib/db.js';

async function main() {
  console.log('🔍 Permit System Test - Checking Prerequisites\n');
  console.log('='.repeat(60));
  
  let canProceed = true;
  
  // Step 1: Check dev server
  console.log('\n1️⃣  Checking dev server...');
  try {
    const response = await fetch('http://localhost:3000', {
      method: 'HEAD',
    });
    console.log('   ✅ Dev server is running on http://localhost:3000');
  } catch (error) {
    console.log('   ❌ Dev server is NOT running');
    console.log('   👉 Run: npm run dev');
    canProceed = false;
  }
  
  // Step 2: Check database connection
  console.log('\n2️⃣  Checking database connection...');
  try {
    await query('SELECT 1');
    console.log('   ✅ Database connected');
  } catch (error) {
    console.log('   ❌ Database connection failed');
    console.log('   👉 Check your DATABASE_URL or PG* environment variables');
    canProceed = false;
  }
  
  // Step 3: Check for API key
  console.log('\n3️⃣  Checking for API key...');
  try {
    const keys = await query(`
      SELECT api_key, key_name, created_at 
      FROM api_keys 
      WHERE is_active = true AND system_name = 'permit_system'
      LIMIT 1
    `);
    
    if (keys.length > 0) {
      console.log('   ✅ API key found');
      console.log(`   📝 Key: ${keys[0].api_key}`);
      console.log(`   📅 Created: ${keys[0].created_at}`);
      
      // Save it for the test
      process.env.PERMIT_API_KEY = keys[0].api_key;
    } else {
      console.log('   ❌ No API key found');
      console.log('   👉 Run: npm run db:seed:api-key');
      canProceed = false;
    }
  } catch (error) {
    console.log('   ❌ Failed to check API keys');
    console.log('   Error:', error);
    canProceed = false;
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (!canProceed) {
    console.log('\n❌ Prerequisites not met. Please fix the issues above.\n');
    process.exit(1);
  }
  
  console.log('\n✅ All prerequisites met! Ready to test.\n');
  console.log('🚀 Submitting test permit...\n');
  
  // Now run the actual permit submission test
  const permitData = {
    permit_id: `TEST-${Date.now()}`,
    permit_type: 'burial',
    deceased_first_name: 'Juan',
    deceased_middle_name: 'Santos',
    deceased_last_name: 'Dela Cruz',
    deceased_suffix: 'Jr.',
    date_of_birth: '1950-05-15',
    date_of_death: '2026-02-01',
    gender: 'Male',
    applicant_name: 'Maria Dela Cruz',
    applicant_email: 'maria@example.com',
    applicant_phone: '+63-912-345-6789',
    relationship_to_deceased: 'Daughter',
    permit_approved_at: new Date().toISOString(),
    preferred_layer: 1,
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/external/permits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERMIT_API_KEY}`,
      },
      body: JSON.stringify(permitData),
    });
    
    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! Permit submitted successfully!');
      console.log(`\n📋 Permit Details:`);
      console.log(`   Permit ID: ${result.permit.permit_id}`);
      console.log(`   Database ID: ${result.permit.id}`);
      console.log(`   Status: ${result.permit.status}`);
      console.log(`\n🌐 View at: http://localhost:3000/dashboard/permits\n`);
    } else {
      console.log('\n❌ Failed to submit permit');
      console.log('Error:', result.error);
      if (result.details) {
        console.log('Validation errors:', JSON.stringify(result.details, null, 2));
      }
    }
  } catch (error) {
    console.log('\n❌ Request failed:', error);
  }
  
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
