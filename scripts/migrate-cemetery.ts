import 'dotenv/config';
import pool, { query } from '../lib/db';
import fs from 'fs';
import path from 'path';

async function runCemeteryMigration() {
  console.log('Running cemetery database migration...');
  
  try {
    // Read the cemetery schema SQL file
    const schemaPath = path.join(process.cwd(), 'database', 'cemetery-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schemaSql);
    
    console.log('✅ Cemetery database schema created successfully!');
    
    // Test the connection and list tables
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name NOT IN ('users', 'login_attempts')
      ORDER BY table_name
    `);
    
    console.log('📋 Cemetery tables created:', result.map(r => r.table_name));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runCemeteryMigration();
