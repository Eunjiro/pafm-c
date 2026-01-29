import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';

const reservationSchema = z.object({
  plot_id: z.number().int().positive(),
  reserved_by: z.string().min(1).max(255),
  reservation_notes: z.string().optional(),
  reservation_days: z.number().int().positive().default(30), // Default 30 days
});

// POST create/update reservation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plot_id, reserved_by, reservation_notes, reservation_days } = reservationSchema.parse(body);

    // Check if plot exists and is available
    const plots = await query(
      'SELECT * FROM grave_plots WHERE id = $1',
      [plot_id]
    );

    if (plots.length === 0) {
      return NextResponse.json(
        { error: 'Plot not found' },
        { status: 404 }
      );
    }

    const plot = plots[0];

    if (plot.status === 'occupied') {
      return NextResponse.json(
        { error: 'Plot is already occupied' },
        { status: 400 }
      );
    }

    // Calculate reservation expiry (default 30 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + reservation_days);

    // Update plot with reservation
    const result = await query(
      `UPDATE grave_plots 
       SET status = 'reserved',
           reserved_by = $1,
           reserved_date = CURRENT_TIMESTAMP,
           reservation_expiry = $2,
           reservation_notes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [reserved_by, expiryDate, reservation_notes || null, plot_id]
    );

    return NextResponse.json(
      { 
        plot: result[0], 
        message: `Plot reserved successfully until ${expiryDate.toISOString().split('T')[0]}` 
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
    
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    );
  }
}

// DELETE cancel reservation
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const plotId = searchParams.get('plot_id');

  if (!plotId) {
    return NextResponse.json(
      { error: 'plot_id is required' },
      { status: 400 }
    );
  }

  try {
    // Check current plot status
    const plots = await query(
      'SELECT * FROM grave_plots WHERE id = $1',
      [plotId]
    );

    if (plots.length === 0) {
      return NextResponse.json(
        { error: 'Plot not found' },
        { status: 404 }
      );
    }

    const plot = plots[0];

    if (plot.status !== 'reserved') {
      return NextResponse.json(
        { error: 'Plot is not reserved' },
        { status: 400 }
      );
    }

    // Cancel reservation and set to available
    const result = await query(
      `UPDATE grave_plots 
       SET status = 'available',
           reserved_by = NULL,
           reserved_date = NULL,
           reservation_expiry = NULL,
           reservation_notes = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [plotId]
    );

    return NextResponse.json(
      { plot: result[0], message: 'Reservation cancelled successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel reservation' },
      { status: 500 }
    );
  }
}

// GET all reserved plots or check expiry
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cemeteryId = searchParams.get('cemetery_id');
  const checkExpired = searchParams.get('check_expired') === 'true';

  try {
    if (checkExpired) {
      // Update expired reservations to available
      await query(
        `UPDATE grave_plots 
         SET status = 'available',
             reserved_by = NULL,
             reserved_date = NULL,
             reservation_expiry = NULL,
             reservation_notes = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE status = 'reserved' 
         AND reservation_expiry < CURRENT_TIMESTAMP`
      );
    }

    // Get all reserved plots
    const plots = await query(
      `SELECT *, 
       EXTRACT(DAY FROM (reservation_expiry::timestamp - CURRENT_TIMESTAMP)) as days_until_expiry
       FROM grave_plots 
       WHERE status = 'reserved'
       ${cemeteryId ? 'AND cemetery_id = $1' : ''}
       ORDER BY reservation_expiry ASC`,
      cemeteryId ? [cemeteryId] : []
    );

    return NextResponse.json({ plots }, { status: 200 });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}
