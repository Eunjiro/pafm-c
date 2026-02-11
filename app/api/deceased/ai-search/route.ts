import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { parseNaturalLanguageQuery, buildSearchQuery } from '@/lib/ai-search';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const cemeteryId = searchParams.get('cemetery_id');
    const useAI = searchParams.get('ai') !== 'false'; // AI enabled by default

    if (!query) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    let results;
    let searchIntent;

    if (useAI) {
      // Use AI to parse the natural language query
      console.log('🤖 Using AI to parse query:', query);
      searchIntent = await parseNaturalLanguageQuery(query);
      console.log('🧠 AI extracted:', searchIntent);

      // Build and execute the query based on AI's understanding
      const { sql, params } = buildSearchQuery(searchIntent, cemeteryId || undefined);
      const result = await pool.query(sql, params);
      results = result.rows;
    } else {
      // Fallback to basic keyword search
      console.log('🔍 Using basic search for:', query);
      const result = await pool.query(
        `SELECT 
          d.id as deceased_id,
          d.first_name,
          d.last_name,
          d.date_of_birth,
          d.date_of_death,
          b.id as burial_id,
          b.burial_date,
          b.position_in_plot,
          b.layer,
          gp.id as plot_id,
          gp.plot_number,
          gp.plot_type,
          gp.status,
          gp.map_coordinates,
          gp.latitude,
          gp.longitude,
          gp.cemetery_id,
          c.name as cemetery_name
        FROM deceased d
        INNER JOIN burials b ON d.id = b.deceased_id
        INNER JOIN grave_plots gp ON b.plot_id = gp.id
        INNER JOIN cemeteries c ON gp.cemetery_id = c.id
        WHERE (
          LOWER(d.first_name) LIKE LOWER($1) OR
          LOWER(d.last_name) LIKE LOWER($1) OR
          LOWER(d.first_name || ' ' || d.last_name) LIKE LOWER($1)
        )
        ${cemeteryId ? 'AND gp.cemetery_id = $2' : ''}
        ORDER BY d.last_name, d.first_name
        LIMIT 20`,
        cemeteryId ? [`%${query}%`, cemeteryId] : [`%${query}%`]
      );
      results = result.rows;
    }

    return NextResponse.json({
      results,
      aiPowered: useAI,
      searchIntent: useAI ? searchIntent : undefined,
      totalResults: results.length,
    });
  } catch (error) {
    console.error('Error searching deceased:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search deceased persons',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
