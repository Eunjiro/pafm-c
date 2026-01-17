/**
 * Script to update center coordinates (latitude, longitude) for existing plots
 * that have map_coordinates but missing lat/lng values
 */

import pool from '../lib/db';

async function updatePlotCoordinates() {
  try {
    console.log('🔍 Fetching plots with map_coordinates but missing center coordinates...\n');

    // Get plots that have map_coordinates but no latitude/longitude
    const result = await pool.query(`
      SELECT id, plot_number, cemetery_id, map_coordinates
      FROM grave_plots
      WHERE map_coordinates IS NOT NULL
        AND (latitude IS NULL OR longitude IS NULL)
    `);

    const plots = result.rows;

    if (plots.length === 0) {
      console.log('✅ All plots already have center coordinates!\n');
      return;
    }

    console.log(`📊 Found ${plots.length} plot(s) that need coordinate updates\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const plot of plots) {
      try {
        const coordinates = plot.map_coordinates;
        
        // Check if coordinates are in array format
        if (!Array.isArray(coordinates) || coordinates.length === 0) {
          console.log(`⚠️  Plot ${plot.plot_number} (ID: ${plot.id}): Invalid coordinate format`);
          errorCount++;
          continue;
        }

        // Calculate center point from polygon coordinates
        let latSum = 0;
        let lngSum = 0;
        let validPoints = 0;

        for (const coord of coordinates) {
          if (Array.isArray(coord) && coord.length === 2) {
            latSum += coord[0];
            lngSum += coord[1];
            validPoints++;
          }
        }

        if (validPoints === 0) {
          console.log(`⚠️  Plot ${plot.plot_number} (ID: ${plot.id}): No valid coordinate points found`);
          errorCount++;
          continue;
        }

        const centerLat = latSum / validPoints;
        const centerLng = lngSum / validPoints;

        // Update the plot with center coordinates
        await pool.query(
          `UPDATE grave_plots
           SET latitude = $1, longitude = $2
           WHERE id = $3`,
          [centerLat, centerLng, plot.id]
        );

        console.log(`✅ Plot ${plot.plot_number} (ID: ${plot.id}): Updated center coordinates (${centerLat.toFixed(6)}, ${centerLng.toFixed(6)})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Plot ${plot.plot_number} (ID: ${plot.id}): Error -`, error);
        errorCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Successfully updated: ${successCount} plot(s)`);
    console.log(`   ❌ Failed: ${errorCount} plot(s)`);
    console.log(`\n✨ Coordinate update complete!\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
updatePlotCoordinates()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
