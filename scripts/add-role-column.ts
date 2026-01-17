import 'dotenv/config';
import pool from '../lib/db';

async function addRoleColumn() {
  console.log('Adding role column to users table...');
  
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin'
    `);
    
    console.log('✅ Role column added successfully!');
    
    // Update existing users to admin
    const result = await pool.query(`
      UPDATE users 
      SET role = 'admin' 
      WHERE role IS NULL
    `);
    
    console.log(`✅ Updated ${result.rowCount} existing users to admin role`);
    
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addRoleColumn();
