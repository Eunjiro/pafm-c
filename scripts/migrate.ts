import 'dotenv/config';
import pool, { query } from '../lib/db';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('Running database migration...');
  
  try {
    // Read the schema SQL file
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schemaSql);
    
    console.log('✅ Database schema created successfully!');
    
    // Test the connection
    const result = await query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'');
    console.log('📋 Tables in database:', result.map(r => r.table_name));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
