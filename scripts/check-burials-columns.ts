import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

async function checkColumns() {
  try {
    console.log('🔍 Checking burials table columns...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'burials' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Burials table columns:');
    result.rows.forEach(c => {
      console.log(`  - ${c.column_name}: ${c.data_type}`);
    });
    
    // Check for specific columns
    const hasExpiration = result.rows.some(c => c.column_name === 'expiration_date');
    const hasRenewal = result.rows.some(c => c.column_name === 'renewal_date');
    const hasExpired = result.rows.some(c => c.column_name === 'is_expired');
    
    console.log('\n✅ Required columns:');
    console.log(`  - expiration_date: ${hasExpiration ? '✓' : '✗ MISSING'}`);
    console.log(`  - renewal_date: ${hasRenewal ? '✓' : '✗ MISSING'}`);
    console.log(`  - is_expired: ${hasExpired ? '✓' : '✗ MISSING'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkColumns();
