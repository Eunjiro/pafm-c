import 'dotenv/config';

async function testPermitsAPI() {
  const DEPLOYED_URL = 'https://pafm-c.vercel.app';
  
  console.log('🔍 Testing Permits API...\n');
  console.log(`Target: ${DEPLOYED_URL}/api/permits?status=pending\n`);
  
  console.log('⚠️  NOTE: This will fail with 401 Unauthorized if not logged in');
  console.log('   You need to test this in your browser while logged in\n');
  
  console.log('📋 Expected permit in database:');
  console.log('   - Permit ID: dd43bc85-2fe5-4b7b-bbc7-0eacf0f8a3ec');
  console.log('   - Deceased: jjdkkam Unknown');
  console.log('   - Type: burial');
  console.log('   - Status: pending\n');
  
  console.log('🧪 Test Steps:');
  console.log('   1. Log in to https://pafm-c.vercel.app/login');
  console.log('   2. Open browser DevTools (F12)');
  console.log('   3. Go to Network tab');
  console.log('   4. Visit: https://pafm-c.vercel.app/dashboard/permits');
  console.log('   5. Look for request to /api/permits?status=pending');
  console.log('   6. Check the response - should contain the permit data\n');
  
  console.log('🔧 Or test API directly in browser console:');
  console.log('   fetch("/api/permits?status=pending").then(r => r.json()).then(console.log)\n');
  
  // Try to fetch without auth (will fail but shows what happens)
  try {
    console.log('📤 Attempting unauthenticated request (expected to fail)...\n');
    const response = await fetch(`${DEPLOYED_URL}/api/permits?status=pending`);
    const text = await response.text();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('❌ Unauthorized (expected) - API requires authentication cookie');
      console.log('   The API is working, you just need to be logged in!\n');
    } else if (response.status === 200) {
      const data = JSON.parse(text);
      console.log('✅ Success! Permits found:', data.permits?.length || 0);
      if (data.permits?.length > 0) {
        console.log('\nPermit details:');
        data.permits.forEach((p: any, i: number) => {
          console.log(`${i + 1}. ${p.permit_id} - ${p.deceased.first_name} ${p.deceased.last_name}`);
        });
      }
    } else {
      console.log('Response:', text);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testPermitsAPI();
