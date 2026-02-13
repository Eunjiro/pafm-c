/**
 * Check database environment configuration
 */

import 'dotenv/config';

console.log('🔍 Checking Database Configuration\n');
console.log('='.repeat(60));

const dbEnvVars = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'PGHOST',
  'PGPORT',
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
];

let hasConfig = false;

console.log('\n📋 Database Environment Variables:\n');

dbEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    hasConfig = true;
    // Mask password if showing
    if (varName.includes('PASSWORD') || varName.includes('URL')) {
      console.log(`   ✅ ${varName}: ${'*'.repeat(20)} (set)`);
    } else {
      console.log(`   ✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`   ❌ ${varName}: (not set)`);
  }
});

console.log('\n' + '='.repeat(60));

if (!hasConfig) {
  console.log('\n❌ No database configuration found!\n');
  console.log('You need to set database environment variables.');
  console.log('Create a .env.local file in the project root with:\n');
  console.log('Option 1: Connection String');
  console.log('DATABASE_URL=postgresql://user:password@host:5432/dbname\n');
  console.log('Option 2: Individual Variables');
  console.log('PGHOST=localhost');
  console.log('PGPORT=5432');
  console.log('PGUSER=your_user');
  console.log('PGPASSWORD=your_password');
  console.log('PGDATABASE=your_database\n');
} else {
  console.log('\n✅ Database configuration found\n');
  
  // Try to parse if it's a URL
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    try {
      const parsed = new URL(url!);
      console.log('📊 Connection Details:');
      console.log(`   Host: ${parsed.hostname}`);
      console.log(`   Port: ${parsed.port || '5432'}`);
      console.log(`   Database: ${parsed.pathname.substring(1)}`);
      console.log(`   User: ${parsed.username}`);
      console.log(`   SSL: ${process.env.POSTGRES_URL ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.log('⚠️  Could not parse DATABASE_URL');
    }
  }
}

console.log('');
