import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';

const burialSchema = z.object({
  plot_id: z.number().int().positive(),
  deceased_id: z.number().int().positive(),
  layer: z.number().int().positive().default(1),
  burial_date: z.string().optional(),
  notes: z.string().optional(),
});

// GET all burials for a plot or cemetery
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const plotId = searchParams.get('plot_id');
  const cemeteryId = searchParams.get('cemetery_id');

  if (!plotId && !cemeteryId) {
    return NextResponse.json(
      { error: 'plot_id or cemetery_id is required' },
      { status: 400 }
    );
  }

  try {
    let burials;
    
    if (plotId) {
      // Get burials for a specific plot
      burials = await query(
        `SELECT b.*, d.first_name, d.last_name, d.date_of_birth, d.date_of_death
         FROM burials b
         JOIN deceased_persons d ON b.deceased_id = d.id
         WHERE b.plot_id = $1
         ORDER BY b.layer ASC`,
        [plotId]
      );
    } else {
      // Get all burials for cemetery
      burials = await query(
        `SELECT b.*, d.first_name, d.last_name, d.date_of_birth, d.date_of_death
         FROM burials b
         JOIN deceased_persons d ON b.deceased_id = d.id
         JOIN grave_plots gp ON b.plot_id = gp.id
         WHERE gp.cemetery_id = $1
         ORDER BY b.plot_id, b.layer ASC`,
        [cemeteryId]
      );
    }

    return NextResponse.json({ burials }, { status: 200 });
  } catch (error) {
    console.error('Error fetching burials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch burials' },
      { status: 500 }
    );
  }
}

// POST create new burial
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = burialSchema.parse(body);

    const result = await query(
      `INSERT INTO burials (
        plot_id, deceased_id, layer, burial_date, notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        validatedData.plot_id,
        validatedData.deceased_id,
        validatedData.layer,
        validatedData.burial_date || null,
        validatedData.notes,
      ]
    );

    // Note: Plot status is now determined by individual layer occupancy, not overall plot status

    return NextResponse.json(
      { burial: result[0], message: 'Burial assigned successfully' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating burial:', error);
    return NextResponse.json(
      { error: 'Failed to create burial' },
      { status: 500 }
    );
  }
}
