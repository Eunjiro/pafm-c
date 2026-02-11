import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';

const renewalSchema = z.object({
  burial_id: z.number().int().positive(),
  years: z.number().int().positive().max(10).default(5), // Default 5 years, max 10 years
});

// POST renew burial period
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { burial_id, years } = renewalSchema.parse(body);

    // Get current burial info
    const burials = await query(
      'SELECT * FROM burials WHERE id = $1',
      [burial_id]
    );

    if (burials.length === 0) {
      return NextResponse.json(
        { error: 'Burial not found' },
        { status: 404 }
      );
    }

    const burial = burials[0];
    
    // Calculate new expiration date
    const currentExpiration = burial.expiration_date 
      ? new Date(burial.expiration_date)
      : burial.burial_date 
        ? new Date(burial.burial_date)
        : new Date();

    // If already expired, renew from today, otherwise extend from current expiration
    const baseDate = burial.is_expired || currentExpiration < new Date() 
      ? new Date() 
      : currentExpiration;
    
    baseDate.setFullYear(baseDate.getFullYear() + years);
    const newExpirationDate = baseDate.toISOString().split('T')[0];

    // Update burial with new expiration date
    const result = await query(
      `UPDATE burials 
       SET expiration_date = $1, 
           renewal_date = CURRENT_DATE,
           is_expired = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [newExpirationDate, burial_id]
    );

    return NextResponse.json(
      { 
        burial: result[0], 
        message: `Burial renewed for ${years} years until ${newExpirationDate}` 
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error renewing burial:', error);
    return NextResponse.json(
      { error: 'Failed to renew burial' },
      { status: 500 }
    );
  }
}

// GET expired burials
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cemeteryId = searchParams.get('cemetery_id');
  const showExpiring = searchParams.get('expiring'); // Show burials expiring in next 90 days

  try {
    let burials;

    if (showExpiring) {
      // Get burials expiring soon (within 90 days)
      burials = await query(
        `SELECT b.*, d.first_name, d.last_name, d.date_of_birth, d.date_of_death,
         gp.plot_number, gp.cemetery_id,
         EXTRACT(DAY FROM (b.expiration_date::timestamp - CURRENT_DATE::timestamp)) as days_until_expiration
         FROM burials b
         JOIN deceased d ON b.deceased_id = d.id
         JOIN grave_plots gp ON b.plot_id = gp.id
         WHERE b.expiration_date IS NOT NULL 
         AND b.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
         AND b.is_expired = FALSE
         ${cemeteryId ? 'AND gp.cemetery_id = $1' : ''}
         ORDER BY b.expiration_date ASC`,
        cemeteryId ? [cemeteryId] : []
      );
    } else {
      // Get expired burials
      burials = await query(
        `SELECT b.*, d.first_name, d.last_name, d.date_of_birth, d.date_of_death,
         gp.plot_number, gp.cemetery_id
         FROM burials b
         JOIN deceased d ON b.deceased_id = d.id
         JOIN grave_plots gp ON b.plot_id = gp.id
         WHERE b.is_expired = TRUE
         ${cemeteryId ? 'AND gp.cemetery_id = $1' : ''}
         ORDER BY b.expiration_date ASC`,
        cemeteryId ? [cemeteryId] : []
      );
    }

    return NextResponse.json({ burials }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expired burials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expired burials' },
      { status: 500 }
    );
  }
}
