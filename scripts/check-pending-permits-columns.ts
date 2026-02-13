import 'dotenv/config';
import { query } from '../lib/db';

async function checkColumns() {
  try {
    console.log('🔍 Checking pending_permits table structure...\n');
    
    const result = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'pending_permits'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columns in pending_permits table:');
    result.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check specifically for burial_id
    const hasBurialId = result.some((col: any) => col.column_name === 'burial_id');
    console.log(`\n${hasBurialId ? '✅' : '❌'} burial_id column ${hasBurialId ? 'EXISTS' : 'MISSING'}`);
    
    if (!hasBurialId) {
      console.log('\n⚠️  The burial_id column is missing! This needs to be added.');
      console.log('💡 You may need to run the migration: npm run db:migrate:pending-permits');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkColumns();
