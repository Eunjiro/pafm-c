import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiKey } from '@/lib/api-auth';

/**
 * GET /api/external/plots
 * Public endpoint for permit system to fetch available plots
 * Requires API key authentication
 */
export async function GET(request: NextRequest) {
  // Verify API key
  const authError = await requireApiKey(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url);
    const cemeteryId = searchParams.get('cemetery_id');
    const sectionId = searchParams.get('section_id');
    const available = searchParams.get('available');
    const layer = searchParams.get('layer');
    const plotType = searchParams.get('type');
    
    let sql = `
      SELECT 
        gp.id,
        gp.plot_number,
        gp.plot_type,
        gp.status,
        gp.latitude,
        gp.longitude,
        gp.map_coordinates,
        gp.layers,
        gp.cemetery_id,
        gp.section_id,
        c.name as cemetery_name,
        c.location as cemetery_location,
        cs.name as section_name,
        (
          SELECT COUNT(*) 
          FROM burials b 
          WHERE b.plot_id = gp.id
        ) as burial_count,
        (
          SELECT json_agg(json_build_object(
            'layer', b.layer,
            'occupied', true
          ))
          FROM burials b
          WHERE b.plot_id = gp.id
        ) as layer_occupancy
      FROM grave_plots gp
      LEFT JOIN cemeteries c ON c.id = gp.cemetery_id
      LEFT JOIN cemetery_sections cs ON cs.id = gp.section_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (cemeteryId) {
      sql += ` AND gp.cemetery_id = $${paramIndex++}`;
      params.push(cemeteryId);
    }
    
    if (sectionId) {
      sql += ` AND gp.section_id = $${paramIndex++}`;
      params.push(sectionId);
    }
    
    if (available === 'true') {
      sql += ` AND gp.status = 'available'`;
    }
    
    if (plotType) {
      sql += ` AND gp.plot_type = $${paramIndex++}`;
      params.push(plotType);
    }
    
    sql += ` ORDER BY gp.plot_number ASC`;
    
    const plots = await query(sql, params);
    
    // Process plots to determine available layers
    const processedPlots = plots.map((plot: any) => {
      const totalLayers = plot.layers || 1;
      const occupiedLayers = plot.layer_occupancy ? plot.layer_occupancy.length : 0;
      const availableLayers: number[] = [];
      
      // Determine which layers are available
      if (plot.layer_occupancy) {
        const occupiedLayerNumbers = plot.layer_occupancy.map((l: any) => l.layer);
        for (let i = 1; i <= totalLayers; i++) {
          if (!occupiedLayerNumbers.includes(i)) {
            availableLayers.push(i);
          }
        }
      } else {
        // All layers available
        for (let i = 1; i <= totalLayers; i++) {
          availableLayers.push(i);
        }
      }
      
      // Filter by layer if specified
      if (layer) {
        const requestedLayer = parseInt(layer);
        if (!availableLayers.includes(requestedLayer)) {
          return null; // Skip this plot
        }
      }
      
      return {
        id: plot.id,
        plot_number: plot.plot_number,
        plot_type: plot.plot_type,
        status: plot.status,
        cemetery: {
          id: plot.cemetery_id,
          name: plot.cemetery_name,
          location: plot.cemetery_location,
        },
        section: plot.section_id ? {
          id: plot.section_id,
          name: plot.section_name,
        } : null,
        coordinates: {
          latitude: plot.latitude,
          longitude: plot.longitude,
          polygon: plot.map_coordinates,
        },
        layers: {
          total: totalLayers,
          occupied: occupiedLayers,
          available: availableLayers,
        },
        burial_count: parseInt(plot.burial_count) || 0,
      };
    }).filter(Boolean); // Remove null entries
    
    return NextResponse.json({
      plots: processedPlots,
      total: processedPlots.length,
    });
    
  } catch (error) {
    console.error('Error fetching plots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plots' },
      { status: 500 }
    );
  }
}
