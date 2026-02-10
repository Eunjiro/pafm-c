import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '../lib/db';
import pool from '../lib/db';

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting pending permits migration...');
    
    // Read the schema file
    const schemaPath = join(process.cwd(), 'database', 'pending-permits-schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Execute the schema
    await client.query(schema);
    
    console.log('✅ Pending permits tables created successfully!');
    
    // Check if tables exist
    const checkTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('pending_permits', 'api_keys')
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Created tables:');
    checkTables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check columns in pending_permits
    const checkColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pending_permits' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📊 Pending Permits columns:');
    checkColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n✨ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. npm run db:seed:api-key (to generate API key for permit system)');
    console.log('   2. Configure webhook URL in permit system');
    console.log('   3. Test integration with sample permit');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
