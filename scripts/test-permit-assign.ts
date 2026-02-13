import 'dotenv/config';
import { query } from '../lib/db';

async function testPermitAssign() {
  try {
    console.log('🧪 Testing permit assignment data...\n');
    
    // Check if there are any pending permits
    const permits = await query(`
      SELECT id, permit_id, status, deceased_first_name, deceased_last_name
      FROM pending_permits 
      WHERE status = 'pending'
      LIMIT 5
    `);
    
    console.log(`📋 Found ${permits.length} pending permits:`);
    permits.forEach((p: any) => {
      console.log(`   - ID: ${p.id}, Permit: ${p.permit_id}, Name: ${p.deceased_first_name} ${p.deceased_last_name}`);
    });
    
    // Check burials table structure
    const burialColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'burials'
      ORDER BY ordinal_position
    `);
    
    console.log(`\n📋 Burials table columns:`);
    burialColumns.forEach((c: any) => {
      console.log(`   - ${c.column_name} (${c.data_type})`);
    });
    
    // Check if there are any recent burials
    const recentBurials = await query(`
      SELECT b.id, b.plot_id, b.deceased_id, b.layer, d.first_name, d.last_name
      FROM burials b
      JOIN deceased_persons d ON b.deceased_id = d.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);
    
    console.log(`\n📋 Recent burials:`);
    recentBurials.forEach((b: any) => {
      console.log(`   - Burial ID: ${b.id}, Plot: ${b.plot_id}, Layer: ${b.layer}, Name: ${b.first_name} ${b.last_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPermitAssign();
