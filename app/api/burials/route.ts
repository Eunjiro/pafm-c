import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { createLog, getClientInfo } from '@/lib/logger';

const burialSchema = z.object({
  plot_id: z.number().int().positive(),
  deceased_id: z.number().int().positive(),
  layer: z.number().int().positive().default(1),
  burial_date: z.string().optional(),
  notes: z.string().optional(),
});

// Helper function to calculate expiration date (5 years from burial)
function calculateExpirationDate(burialDate: string | null): string | null {
  if (!burialDate) return null;
  const date = new Date(burialDate);
  date.setFullYear(date.getFullYear() + 5);
  return date.toISOString().split('T')[0];
}

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
      // Get burials for a specific plot with expiration info
      burials = await query(
        `SELECT b.*, d.first_name, d.last_name, d.date_of_birth, d.date_of_death,
         CASE 
           WHEN b.expiration_date IS NOT NULL AND b.expiration_date < CURRENT_DATE THEN TRUE
           ELSE FALSE
         END as is_expired,
         CASE 
           WHEN b.expiration_date IS NOT NULL THEN 
             EXTRACT(DAY FROM (b.expiration_date::timestamp - CURRENT_DATE::timestamp))
           ELSE NULL
         END as days_until_expiration
         FROM burials b
         JOIN deceased_persons d ON b.deceased_id = d.id
         WHERE b.plot_id = $1
         ORDER BY b.burial_date DESC`,
        [plotId]
      );
    } else {
      // Get all burials for cemetery with expiration info
      burials = await query(
        `SELECT b.*, d.first_name, d.last_name, d.date_of_birth, d.date_of_death,
         CASE 
           WHEN b.expiration_date IS NOT NULL AND b.expiration_date < CURRENT_DATE THEN TRUE
           ELSE FALSE
         END as is_expired,
         CASE 
           WHEN b.expiration_date IS NOT NULL THEN 
             EXTRACT(DAY FROM (b.expiration_date::timestamp - CURRENT_DATE::timestamp))
           ELSE NULL
         END as days_until_expiration
         FROM burials b
         JOIN deceased_persons d ON b.deceased_id = d.id
         JOIN grave_plots gp ON b.plot_id = gp.id
         WHERE gp.cemetery_id = $1
         ORDER BY b.plot_id, b.burial_date DESC`,
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

    // Calculate expiration date (5 years from burial)
    const expirationDate = calculateExpirationDate(validatedData.burial_date || null);

    const result = await query(
      `INSERT INTO burials (
        plot_id, deceased_id, layer, burial_date, expiration_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        validatedData.plot_id,
        validatedData.deceased_id,
        validatedData.layer,
        validatedData.burial_date || null,
        expirationDate,
        validatedData.notes,
      ]
    );

    // Get deceased person info for logging
    const deceasedInfo = await query(
      'SELECT first_name, last_name FROM deceased_persons WHERE id = $1',
      [validatedData.deceased_id]
    );
    const deceasedName = deceasedInfo.length > 0 
      ? `${deceasedInfo[0].first_name} ${deceasedInfo[0].last_name}`
      : `ID ${validatedData.deceased_id}`;

    // Log the burial creation
    const { ipAddress, userAgent } = getClientInfo(request);
    await createLog({
      action: 'burial_create',
      description: `Assigned burial for ${deceasedName} to plot ID ${validatedData.plot_id}, layer ${validatedData.layer}`,
      resourceType: 'burial',
      resourceId: result[0].id,
      ipAddress,
      userAgent,
      status: 'success',
    });

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
