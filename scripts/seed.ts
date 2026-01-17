import 'dotenv/config';
import pool, { query } from '../lib/db';
import bcrypt from 'bcryptjs';

interface SeedUser {
  email: string;
  password: string;
  name: string;
}

// Users to seed into the database
const usersToSeed: SeedUser[] = [
  {
    email: 'admin@example.com',
    password: 'Admin123!',
    name: 'Admin User',
  },
  {
    email: 'user@example.com',
    password: 'password123',
    name: 'Test User',
  },
  {
    email: 'john.doe@example.com',
    password: 'SecurePass456!',
    name: 'John Doe',
  },
];

async function seedUsers() {
  console.log('🌱 Seeding users...');
  
  try {
    for (const user of usersToSeed) {
      // Check if user already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );
      
      if (existingUser.length > 0) {
        console.log(`⏭️  User ${user.email} already exists, skipping...`);
        continue;
      }
      
      // Hash the password
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      // Insert the user
      await query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)',
        [user.email, passwordHash, user.name]
      );
      
      console.log(`✅ Created user: ${user.email}`);
    }
    
    console.log('\n✨ Seeding completed successfully!');
    console.log('\n📝 Test credentials:');
    usersToSeed.forEach((user: SeedUser) => {
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}\n`);
    });
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedUsers();
