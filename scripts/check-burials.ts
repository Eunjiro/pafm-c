import 'dotenv/config';
import { query } from '../lib/db';
import pool from '../lib/db';

async function checkBurials() {
  console.log('🔍 Checking burials and deceased persons...\n');
  
  try {
    // Check deceased persons
    console.log('📋 Deceased Persons:');
    const deceased = await query('SELECT id, first_name, last_name FROM deceased_persons ORDER BY id');
    if (deceased.length === 0) {
      console.log('   ⚠️  No deceased persons found in database');
    } else {
      deceased.forEach(d => {
        console.log(`   - ID: ${d.id}, Name: ${d.first_name} ${d.last_name}`);
      });
    }
    
    console.log('\n📋 Burials:');
    const burials = await query(`
      SELECT b.id, b.plot_id, b.deceased_id, b.layer, 
             d.first_name, d.last_name,
             gp.plot_number
      FROM burials b
      LEFT JOIN deceased_persons d ON b.deceased_id = d.id
      LEFT JOIN grave_plots gp ON b.plot_id = gp.id
      ORDER BY b.id
    `);
    
    if (burials.length === 0) {
      console.log('   ⚠️  No burials found in database');
    } else {
      burials.forEach(b => {
        console.log(`   - Burial ID: ${b.id}, Plot: ${b.plot_number}, Deceased: ${b.first_name} ${b.last_name}, Layer: ${b.layer}`);
      });
    }
    
    console.log('\n📋 Plots with A-1:');
    const plotA1 = await query("SELECT id, plot_number, cemetery_id, status FROM grave_plots WHERE plot_number = 'A-1'");
    if (plotA1.length === 0) {
      console.log('   ⚠️  Plot A-1 not found');
    } else {
      plotA1.forEach(p => {
        console.log(`   - Plot ID: ${p.id}, Plot Number: ${p.plot_number}, Cemetery ID: ${p.cemetery_id}, Status: ${p.status}`);
      });
      
      // Check burials for this plot
      if (plotA1.length > 0) {
        const plotBurials = await query(`
          SELECT b.*, d.first_name, d.last_name
          FROM burials b
          LEFT JOIN deceased_persons d ON b.deceased_id = d.id
          WHERE b.plot_id = $1
        `, [plotA1[0].id]);
        
        console.log('\n📋 Burials in Plot A-1:');
        if (plotBurials.length === 0) {
          console.log('   ⚠️  No burials found for plot A-1');
        } else {
          plotBurials.forEach(b => {
            console.log(`   - Deceased: ${b.first_name} ${b.last_name}, Layer: ${b.layer}`);
          });
        }
      }
    }
    
    console.log('\n📋 Test Search Query (simulating API):');
    const testSearch = await query(`
      SELECT 
        d.id as deceased_id,
        d.first_name,
        d.last_name,
        d.date_of_birth,
        d.date_of_death,
        b.id as burial_id,
        b.burial_date,
        b.position_in_plot,
        b.layer,
        gp.id as plot_id,
        gp.plot_number,
        gp.plot_type,
        gp.status,
        gp.cemetery_id,
        c.name as cemetery_name
      FROM deceased_persons d
      INNER JOIN burials b ON d.id = b.deceased_id
      INNER JOIN grave_plots gp ON b.plot_id = gp.id
      INNER JOIN cemeteries c ON gp.cemetery_id = c.id
      LIMIT 10
    `);
    
    if (testSearch.length === 0) {
      console.log('   ⚠️  No complete burial records found (deceased → burials → plots → cemeteries)');
    } else {
      console.log(`   ✅ Found ${testSearch.length} searchable records:`);
      testSearch.forEach(r => {
        console.log(`   - ${r.first_name} ${r.last_name} → Plot ${r.plot_number} (Cemetery: ${r.cemetery_name})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkBurials();
