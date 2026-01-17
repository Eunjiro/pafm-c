import 'dotenv/config';
import pool, { testConnection } from '../lib/db';

async function testDb() {
  console.log('🧪 Testing database connection...\n');
  
  const connected = await testConnection();
  
  if (connected) {
    console.log('✅ Database connection successful!\n');
    
    // Check if tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log('⚠️  No tables found. Run the migration first:');
      console.log('   npx tsx scripts/migrate.ts\n');
    } else {
      console.log('📋 Tables found:');
      tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
      console.log();
    }
  } else {
    console.log('❌ Database connection failed!');
    console.log('Please check your .env.local file and ensure PostgreSQL is running.\n');
  }
  
  await pool.end();
  process.exit(connected ? 0 : 1);
}

testDb();
