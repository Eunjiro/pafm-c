import 'dotenv/config';
import pool, { query } from '../lib/db';

async function clearLoginAttempts() {
  console.log('🧹 Clearing old login attempts...');
  
  try {
    // Delete all login attempts older than 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const result = await pool.query(
      'DELETE FROM login_attempts WHERE attempt_time < $1',
      [fifteenMinutesAgo]
    );
    
    console.log(`✅ Cleared ${result.rowCount} old login attempts`);
    
    // Optionally, clear ALL login attempts (use with caution)
    if (process.argv.includes('--all')) {
      const allResult = await pool.query('DELETE FROM login_attempts');
      console.log(`✅ Cleared ALL ${allResult.rowCount} login attempts`);
    }
    
  } catch (error) {
    console.error('❌ Failed to clear login attempts:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearLoginAttempts();
