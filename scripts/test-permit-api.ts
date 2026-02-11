import 'dotenv/config';

const API_KEY = 'pk_dec7b8a49db514e873ed6be76d9c7b9fe727320c9a25beeda71736192c222c53';
const CEMETERY_URL = process.env.CEMETERY_API_URL || 'https://pafm-cemetery-system.vercel.app';

async function testPermitSubmission() {
  console.log('📋 Testing Permit API Submission...\n');
  console.log(`API URL: ${CEMETERY_URL}/api/external/permits`);
  console.log(`API Key: ${API_KEY.substring(0, 20)}...\n`);
  
  // Example valid permit payload
  const validPermit = {
    permit_id: 'TEST-PERMIT-' + Date.now(),
    permit_type: 'burial',
    
    // Deceased information (REQUIRED)
    deceased_first_name: 'Juan',
    deceased_middle_name: 'Cruz',
    deceased_last_name: 'Dela Cruz',
    deceased_suffix: '',
    date_of_birth: '1950-01-15',
    date_of_death: '2026-02-10',
    gender: 'male',
    
    // Applicant information (REQUIRED: applicant_name)
    applicant_name: 'Maria Dela Cruz',
    applicant_email: 'maria@example.com',
    applicant_phone: '+63 912 345 6789',
    relationship_to_deceased: 'Daughter',
    
    // Plot preferences (OPTIONAL)
    // preferred_cemetery_id: 1,
    // preferred_plot_id: 10,
    preferred_section: 'Section A',
    preferred_layer: 1,
    
    // Permit details (REQUIRED: permit_approved_at)
    permit_approved_at: new Date().toISOString(),
    permit_expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    permit_document_url: 'https://example.com/permits/12345.pdf',
    
    // Additional metadata (OPTIONAL)
    metadata: {
      source: 'test_script',
      notes: 'Testing API integration'
    }
  };
  
  console.log('✅ REQUIRED FIELDS:');
  console.log('   - permit_id (unique string)');
  console.log('   - permit_type (burial|exhumation|niche|entrance)');
  console.log('   - deceased_first_name');
  console.log('   - deceased_last_name');
  console.log('   - date_of_death');
  console.log('   - applicant_name');
  console.log('   - permit_approved_at\n');
  
  console.log('📤 Sending test permit...\n');
  
  try {
    const response = await fetch(`${CEMETERY_URL}/api/external/permits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(validPermit)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS! Permit submitted successfully\n');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ FAILED with status ${response.status}\n`);
      console.log('Error Response:', JSON.stringify(data, null, 2));
      
      if (data.details) {
        console.log('\n🔍 Validation Issues:');
        data.details.forEach((issue: any) => {
          console.log(`   - ${issue.path.join('.')}: ${issue.message}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testPermitSubmission();
