import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query, queryOne } from '@/lib/db';
import { createLog, getClientInfo } from '@/lib/logger';

const burialSchema = z.object({
  plot_id: z.number().int().positive().optional(),
  deceased_id: z.number().int().positive().optional(),
  layer: z.number().int().positive().optional(),
  burial_date: z.string().optional(),
  notes: z.string().optional(),
});

// GET single burial with expiration info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const burial = await queryOne(
      `SELECT b.*, d.first_name, d.last_name, d.date_of_birth, d.date_of_death,
       CASE 
         WHEN b.expiration_date IS NOT NULL AND b.expiration_date < CURRENT_DATE THEN TRUE
         ELSE FALSE
       END as is_expired_status,
       CASE 
         WHEN b.expiration_date IS NOT NULL THEN 
           EXTRACT(DAY FROM (b.expiration_date::timestamp - CURRENT_DATE::timestamp))
         ELSE NULL
       END as days_until_expiration
       FROM burials b
       JOIN deceased d ON b.deceased_id = d.id
       WHERE b.id = $1`,
      [id]
    );

    if (!burial) {
      return NextResponse.json(
        { error: 'Burial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ burial }, { status: 200 });
  } catch (error) {
    console.error('Error fetching burial:', error);
    return NextResponse.json(
      { error: 'Failed to fetch burial' },
      { status: 500 }
    );
  }
}

// PUT update burial
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = burialSchema.parse(body);

    const result = await query(
      `UPDATE burials SET
        layer = COALESCE($1, layer),
        burial_date = COALESCE($2, burial_date),
        notes = COALESCE($3, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`,
      [
        validatedData.layer,
        validatedData.burial_date || null,
        validatedData.notes,
        id,
      ]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Burial not found' },
        { status: 404 }
      );
    }

    // Get deceased person info for logging
    const burialInfo = await queryOne(
      `SELECT d.first_name, d.last_name, b.plot_id 
       FROM burials b
       JOIN deceased d ON b.deceased_id = d.id
       WHERE b.id = $1`,
      [id]
    );

    // Log the burial update
    const { ipAddress, userAgent } = getClientInfo(request);
    await createLog({
      action: 'burial_update',
      description: `Updated burial for ${burialInfo?.first_name || ''} ${burialInfo?.last_name || ''} (Plot ID: ${burialInfo?.plot_id || 'unknown'})`,
      resourceType: 'burial',
      resourceId: Number(id),
      ipAddress,
      userAgent,
      status: 'success',
    });

    return NextResponse.json(
      { burial: result[0], message: 'Burial updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating burial:', error);
    return NextResponse.json(
      { error: 'Failed to update burial' },
      { status: 500 }
    );
  }
}

// DELETE burial
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get burial info before deletion for logging
    const burialInfo = await queryOne(
      `SELECT d.first_name, d.last_name, b.plot_id 
       FROM burials b
       JOIN deceased d ON b.deceased_id = d.id
       WHERE b.id = $1`,
      [id]
    );
    
    const result = await query(
      'DELETE FROM burials WHERE id = $1 RETURNING plot_id',
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Burial not found' },
        { status: 404 }
      );
    }

    // Log the burial deletion
    const { ipAddress, userAgent } = getClientInfo(request);
    await createLog({
      action: 'burial_delete',
      description: `Removed burial for ${burialInfo?.first_name || ''} ${burialInfo?.last_name || ''} from plot ID ${result[0].plot_id}`,
      resourceType: 'burial',
      resourceId: Number(id),
      ipAddress,
      userAgent,
      status: 'success',
    });

    // Note: Plot status is now determined by individual layer occupancy

    return NextResponse.json(
      { message: 'Burial removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting burial:', error);
    return NextResponse.json(
      { error: 'Failed to delete burial' },
      { status: 500 }
    );
  }
}
