import 'dotenv/config';
import pool from '../lib/db';

async function checkUsers() {
  const client = await pool.connect();
  
  try {
    console.log('📋 Checking users table...\n');
    
    // Check if role column exists
    const columns = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Users table columns:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})${col.column_default ? ' DEFAULT: ' + col.column_default : ''}`);
    });
    
    // Check existing users
    const users = await client.query(`
      SELECT id, email, name, role, created_at, is_active
      FROM users
      ORDER BY id
    `);
    
    console.log(`\n📊 Found ${users.rows.length} users:\n`);
    users.rows.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role || '(no role)'}`);
      console.log(`   Active: ${user.is_active ? '✅' : '❌'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('\n⚠️  Role column might be missing! Need to add it.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsers();
