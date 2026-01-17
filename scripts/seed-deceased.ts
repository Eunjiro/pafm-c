import 'dotenv/config';
import pool, { query } from '../lib/db';

interface DeceasedPerson {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  date_of_death: string;
  biography?: string;
}

const deceasedPersons: DeceasedPerson[] = [
  {
    first_name: 'John',
    last_name: 'Smith',
    date_of_birth: '1940-05-15',
    date_of_death: '2020-08-20',
    biography: 'Loving father and grandfather who served in the military for 20 years.',
  },
  {
    first_name: 'Mary',
    last_name: 'Johnson',
    date_of_birth: '1945-03-22',
    date_of_death: '2021-11-10',
    biography: 'Devoted teacher and community volunteer.',
  },
  {
    first_name: 'Robert',
    last_name: 'Williams',
    date_of_birth: '1938-09-08',
    date_of_death: '2019-06-15',
    biography: 'Veteran and local business owner.',
  },
  {
    first_name: 'Elizabeth',
    last_name: 'Brown',
    date_of_birth: '1950-12-03',
    date_of_death: '2022-02-28',
    biography: 'Beloved wife, mother, and artist.',
  },
  {
    first_name: 'James',
    last_name: 'Davis',
    date_of_birth: '1935-07-19',
    date_of_death: '2018-09-05',
    biography: 'Engineer and inventor with multiple patents.',
  },
];

async function seedDeceasedPersons() {
  console.log('🌱 Seeding deceased persons...');
  
  try {
    // First, check if there are any plots available
    const plotsResult = await query(
      'SELECT id, plot_number, cemetery_id FROM grave_plots ORDER BY id LIMIT 10'
    );

    if (plotsResult.length === 0) {
      console.log('⚠️  No plots found. Please create some plots first before seeding deceased persons.');
      return;
    }

    console.log(`📍 Found ${plotsResult.length} plots available`);

    for (let i = 0; i < deceasedPersons.length; i++) {
      const person = deceasedPersons[i];
      
      // Check if person already exists
      const existingPerson = await query(
        'SELECT id FROM deceased_persons WHERE first_name = $1 AND last_name = $2',
        [person.first_name, person.last_name]
      );
      
      if (existingPerson.length > 0) {
        console.log(`⏭️  ${person.first_name} ${person.last_name} already exists, skipping...`);
        continue;
      }
      
      // Insert deceased person
      const deceasedResult = await query(
        `INSERT INTO deceased_persons (first_name, last_name, date_of_birth, date_of_death, biography)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [person.first_name, person.last_name, person.date_of_birth, person.date_of_death, person.biography]
      );
      
      const deceasedId = deceasedResult[0].id;
      
      // Assign to a plot (cycle through available plots)
      const plotIndex = i % plotsResult.length;
      const plot = plotsResult[plotIndex];
      
      // Create burial record
      await query(
        `INSERT INTO burials (plot_id, deceased_id, burial_date, layer, position_in_plot, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [plot.id, deceasedId, person.date_of_death, 1, 1, true]
      );
      
      console.log(`✅ Created: ${person.first_name} ${person.last_name} → Plot ${plot.plot_number}`);
    }
    
    console.log('\n✨ Deceased persons seeding completed successfully!');
    console.log('\n📝 You can now search for these names:');
    deceasedPersons.forEach((person) => {
      console.log(`   - ${person.first_name} ${person.last_name}`);
    });
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDeceasedPersons();
