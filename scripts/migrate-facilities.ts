import 'dotenv/config';
import pool from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function migrateFacilities() {
  try {
    console.log('🏗️  Starting facilities table migration...\n');

    // Read the schema file
    const schemaPath = path.join(process.cwd(), 'database', 'facilities-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Execute the schema
    await pool.query(schema);

    console.log('✅ Facilities table created successfully!');
    console.log('   - Table: facilities');
    console.log('   - Indexes: cemetery_id, facility_type');
    console.log('   - Trigger: update_facilities_updated_at\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateFacilities();
