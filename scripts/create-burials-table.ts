import { query } from '../lib/db';

async function createBurialsTable() {
  
  try {
    console.log('Connected to database');

    // Create burials table
    await query(`
      CREATE TABLE IF NOT EXISTS burials (
        id SERIAL PRIMARY KEY,
        plot_id INTEGER NOT NULL REFERENCES grave_plots(id) ON DELETE CASCADE,
        deceased_id INTEGER NOT NULL REFERENCES deceased(id) ON DELETE CASCADE,
        layer INTEGER NOT NULL DEFAULT 1,
        burial_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(plot_id, layer)
      );
    `);
    console.log('✓ Burials table created');

    // Rename layer column in grave_plots to max_layers
    await query(`
      ALTER TABLE grave_plots 
      RENAME COLUMN layer TO max_layers;
    `);
    console.log('✓ Renamed layer to max_layers in grave_plots');

    console.log('\n✅ Database schema updated successfully!');
    console.log('- Burials table created with deceased assignments per layer');
    console.log('- Plot layer field renamed to max_layers (plot capacity)');
    
  } catch (error) {
    console.error('❌ Error updating database:', error);
    throw error;
  }
}

createBurialsTable();
