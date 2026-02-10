import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiKey } from '@/lib/api-auth';

/**
 * GET /api/external/cemeteries
 * Public endpoint for permit system to fetch cemetery list
 * Requires API key authentication
 */
export async function GET(request: NextRequest) {
  // Verify API key
  const authError = await requireApiKey(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    
    let sql = `
      SELECT 
        c.id,
        c.name,
        c.location,
        c.total_plots,
        c.map_coordinates,
        COUNT(DISTINCT gp.id) as total_plot_count,
        COUNT(DISTINCT CASE WHEN gp.status = 'available' THEN gp.id END) as available_plot_count,
        COUNT(DISTINCT cs.id) as section_count
      FROM cemeteries c
      LEFT JOIN cemetery_sections cs ON cs.cemetery_id = c.id
      LEFT JOIN grave_plots gp ON gp.cemetery_id = c.id
    `;
    
    const params: any[] = [];
    
    if (active === 'true') {
      sql += ' WHERE c.is_active = true';
    }
    
    sql += `
      GROUP BY c.id, c.name, c.location, c.total_plots, c.map_coordinates
      ORDER BY c.name ASC
    `;
    
    const cemeteries = await query(sql, params);
    
    return NextResponse.json({
      cemeteries: cemeteries.map((cemetery: any) => ({
        id: cemetery.id,
        name: cemetery.name,
        location: cemetery.location,
        total_plots: cemetery.total_plots,
        available_plots: parseInt(cemetery.available_plot_count) || 0,
        occupied_plots: parseInt(cemetery.total_plot_count) - parseInt(cemetery.available_plot_count) || 0,
        sections: parseInt(cemetery.section_count) || 0,
        coordinates: cemetery.map_coordinates,
      })),
    });
    
  } catch (error) {
    console.error('Error fetching cemeteries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cemeteries' },
      { status: 500 }
    );
  }
}
