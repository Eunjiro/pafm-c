import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

async function addColumns() {
  try {
    console.log('🔄 Adding expiration columns to burials table...');
    console.log('📊 Database:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[1] || 'unknown');
    
    // Add columns
    await pool.query(`
      ALTER TABLE burials
      ADD COLUMN IF NOT EXISTS expiration_date DATE,
      ADD COLUMN IF NOT EXISTS renewal_date DATE,
      ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE
    `);
    
    console.log('✅ Columns added successfully');
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_burials_expiration_date ON burials(expiration_date);
      CREATE INDEX IF NOT EXISTS idx_burials_is_expired ON burials(is_expired);
    `);
    
    console.log('✅ Indexes created');
    
    // Update existing burials
    await pool.query(`
      UPDATE burials 
      SET expiration_date = burial_date + INTERVAL '5 years'
      WHERE burial_date IS NOT NULL AND expiration_date IS NULL
    `);
    
    console.log('✅ Existing burials updated');
    
    // Verify columns
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'burials' AND column_name IN ('expiration_date', 'renewal_date', 'is_expired')
    `);
    
    console.log('\n📋 Verified columns:');
    result.rows.forEach(c => console.log(`  ✓ ${c.column_name}`));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

addColumns();
