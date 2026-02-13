/**
 * Test script to submit a sample permit to the external API endpoint
 * This simulates what the permit system would send
 */

import 'dotenv/config';

async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/external/permits', {
      method: 'GET',
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function testPermitSubmission() {
  // Check if dev server is running
  console.log('🔍 Checking if dev server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Dev server is not running on http://localhost:3000');
    console.log('\nPlease start the dev server first:');
    console.log('  npm run dev\n');
    process.exit(1);
  }
  console.log('✅ Dev server is running\n');
  
  // First, get an API key from the database
  // In production, the permit system would have this API key
  const apiKey = process.env.PERMIT_API_KEY || 'test-api-key-12345';
  
  const permitData = {
    // Required fields
    permit_id: `TEST-PERMIT-${Date.now()}`,
    permit_type: 'burial',
    deceased_first_name: 'Juan',
    deceased_last_name: 'Dela Cruz',
    date_of_death: '2026-02-01',
    applicant_name: 'Maria Dela Cruz',
    permit_approved_at: new Date().toISOString(),
    
    // Optional deceased information
    deceased_middle_name: 'Santos',
    deceased_suffix: 'Jr.',
    date_of_birth: '1950-05-15',
    gender: 'Male',
    
    // Optional applicant information
    applicant_email: 'maria.delacruz@example.com',
    applicant_phone: '+63-912-345-6789',
    relationship_to_deceased: 'Daughter',
    
    // Optional plot preferences
    preferred_cemetery_id: 1, // Optional: specify if known
    preferred_layer: 1,
    
    // Optional permit details
    permit_expiry_date: '2026-08-01',
    permit_document_url: 'https://example.com/permits/12345.pdf',
    
    // Optional metadata
    metadata: {
      processing_office: 'City Hall',
      reference_number: 'REF-2026-001'
    }
  };
  
  console.log('Submitting test permit...\n');
  console.log('Permit Data:', JSON.stringify(permitData, null, 2));
  console.log('\n---\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/external/permits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(permitData),
    });
    
    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Permit submitted successfully!');
      console.log(`Permit ID: ${result.permit.permit_id}`);
      console.log(`Database ID: ${result.permit.id}`);
      console.log('\nYou can now view this permit at: http://localhost:3000/dashboard/permits');
    } else {
      console.log('\n❌ Failed to submit permit');
      console.log('Error:', result.error || 'Unknown error');
      if (result.details) {
        console.log('Details:', JSON.stringify(result.details, null, 2));
      }
      
      if (response.status === 401 || response.status === 403) {
        console.log('\n💡 This is likely an API key issue.');
        console.log('Steps to fix:');
        console.log('1. Check if API key exists: npm run db:check:api-keys');
        console.log('2. Create API key if needed: npm run db:seed:api-key');
        console.log('3. Set the environment variable with the key from step 1');
      }
    }
  } catch (error) {
    console.error('\n❌ Error submitting permit:', error);
    console.log('\n💡 Troubleshooting steps:');
    console.log('1. Make sure the dev server is running: npm run dev');
    console.log('2. Check if API key exists: npm run db:check:api-keys');
    console.log('3. Create API key if needed: npm run db:seed:api-key');
    console.log('4. Set PERMIT_API_KEY environment variable');
    process.exit(1);
  }
}

testPermitSubmission();
