import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Try .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'cemetery_db',
  ssl: process.env.POSTGRES_URL ? { rejectUnauthorized: false } : false,
});

async function checkAndFixExpirationDates() {
  console.log('🔍 Checking burial expiration dates...\n');

  try {
    // Check if expiration_date column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'burials' 
      AND column_name = 'expiration_date'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('❌ Error: expiration_date column does not exist!');
      console.log('📝 Please run: npm run db:migrate:reservation');
      process.exit(1);
    }

    console.log('✅ expiration_date column exists');

    // Get all burials
    const result = await pool.query(`
      SELECT id, burial_date, expiration_date, is_expired 
      FROM burials 
      ORDER BY id
    `);

    console.log(`\n📊 Found ${result.rows.length} burials\n`);

    if (result.rows.length === 0) {
      console.log('No burials to process.');
      process.exit(0);
    }

    // Check each burial
    let needsUpdate = 0;
    let alreadySet = 0;

    for (const burial of result.rows) {
      if (burial.burial_date && !burial.expiration_date) {
        needsUpdate++;
        console.log(`⚠️  Burial ID ${burial.id}: Missing expiration (burial: ${burial.burial_date})`);
      } else if (burial.expiration_date) {
        alreadySet++;
        const isExpired = new Date(burial.expiration_date) < new Date();
        console.log(`✓ Burial ID ${burial.id}: Expires ${burial.expiration_date} ${isExpired ? '(EXPIRED)' : ''}`);
      } else {
        console.log(`⚪ Burial ID ${burial.id}: No burial date set`);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Already set: ${alreadySet}`);
    console.log(`   Needs update: ${needsUpdate}`);
    console.log(`   No burial date: ${result.rows.length - needsUpdate - alreadySet}`);

    if (needsUpdate > 0) {
      console.log(`\n🔧 Updating ${needsUpdate} burials with missing expiration dates...`);
      
      const updateResult = await pool.query(`
        UPDATE burials 
        SET expiration_date = burial_date + INTERVAL '5 years',
            updated_at = CURRENT_TIMESTAMP
        WHERE burial_date IS NOT NULL 
        AND expiration_date IS NULL
        RETURNING id, burial_date, expiration_date
      `);

      console.log(`✅ Updated ${updateResult.rows.length} burials:`);
      updateResult.rows.forEach(row => {
        console.log(`   ID ${row.id}: ${row.burial_date} → expires ${row.expiration_date}`);
      });

      // Update is_expired flags
      const expiredResult = await pool.query(`
        UPDATE burials
        SET is_expired = TRUE
        WHERE expiration_date IS NOT NULL 
        AND expiration_date < CURRENT_DATE 
        AND is_expired = FALSE
        RETURNING id
      `);

      if (expiredResult.rows.length > 0) {
        console.log(`\n⚠️  Marked ${expiredResult.rows.length} burials as expired`);
      }
    } else {
      console.log('\n✅ All burials with burial dates have expiration dates!');
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkAndFixExpirationDates();
