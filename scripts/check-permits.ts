import 'dotenv/config';
import { query } from '../lib/db.js';

async function checkPermits() {
  console.log('Checking recent permits...\n');
  
  const permits = await query(`
    SELECT 
      id, 
      permit_id, 
      deceased_first_name, 
      deceased_middle_name,
      deceased_last_name, 
      deceased_suffix,
      date_of_birth, 
      date_of_death,
      gender,
      applicant_name,
      status,
      created_at
    FROM pending_permits 
    ORDER BY created_at DESC 
    LIMIT 10
  `);
  
  if (permits.length === 0) {
    console.log('No permits found in database.');
  } else {
    console.log(`Found ${permits.length} permit(s):\n`);
    permits.forEach((permit: any) => {
      console.log(`ID: ${permit.id}`);
      console.log(`Permit ID: ${permit.permit_id}`);
      console.log(`Deceased: ${permit.deceased_first_name} ${permit.deceased_middle_name || ''} ${permit.deceased_last_name} ${permit.deceased_suffix || ''}`);
      console.log(`Date of Birth: ${permit.date_of_birth || 'N/A'}`);
      console.log(`Date of Death: ${permit.date_of_death}`);
      console.log(`Gender: ${permit.gender || 'N/A'}`);
      console.log(`Applicant: ${permit.applicant_name}`);
      console.log(`Status: ${permit.status}`);
      console.log(`Created: ${permit.created_at}`);
      console.log('---\n');
    });
  }
  
  process.exit(0);
}

checkPermits().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
