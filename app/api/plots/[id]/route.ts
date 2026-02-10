import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query, queryOne } from '@/lib/db';
import { createLog, getClientInfo } from '@/lib/logger';

const plotSchema = z.object({
  cemetery_id: z.number().int().positive().optional(),
  section_id: z.number().int().positive().optional(),
  plot_number: z.string().min(1).max(50),
  plot_type: z.string().max(50).optional(),
  status: z.enum(['available', 'occupied', 'reserved', 'unavailable']),
  size_length: z.number().positive().optional(),
  size_width: z.number().positive().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  map_coordinates: z.union([
    z.object({
      x: z.number(),
      y: z.number(),
    }),
    z.array(z.tuple([z.number(), z.number()])),
  ]).optional(),
  price: z.number().positive().optional(),
  notes: z.string().optional(),
  layers: z.number().int().positive().optional(),
});

// GET single plot
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plotData = await queryOne(
      'SELECT * FROM grave_plots WHERE id = $1',
      [id]
    );

    if (!plotData) {
      return NextResponse.json(
        { error: 'Plot not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const plot = {
      ...plotData,
      map_coordinates: plotData.map_coordinates ? 
        (typeof plotData.map_coordinates === 'string' ? JSON.parse(plotData.map_coordinates) : plotData.map_coordinates) 
        : null,
    };

    return NextResponse.json({ plot }, { status: 200 });
  } catch (error) {
    console.error('Error fetching plot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plot' },
      { status: 500 }
    );
  }
}

// PUT update plot
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = plotSchema.parse(body);

    const result = await query(
      `UPDATE grave_plots SET
        plot_number = $1, plot_type = $2, status = $3,
        size_length = $4, size_width = $5, latitude = $6, longitude = $7,
        map_coordinates = $8, price = $9, notes = $10, layers = $11, updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *`,
      [
        validatedData.plot_number,
        validatedData.plot_type,
        validatedData.status,
        validatedData.size_length,
        validatedData.size_width,
        validatedData.latitude,
        validatedData.longitude,
        validatedData.map_coordinates ? JSON.stringify(validatedData.map_coordinates) : null,
        validatedData.price,
        validatedData.notes,
        validatedData.layers,
        id,
      ]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Plot not found' },
        { status: 404 }
      );
    }

    // Log the plot update
    const { ipAddress, userAgent } = getClientInfo(request);
    await createLog({
      action: 'plot_update',
      description: `Updated plot ${validatedData.plot_number}`,
      resourceType: 'plot',
      resourceId: Number(id),
      ipAddress,
      userAgent,
      status: 'success',
    });

    return NextResponse.json(
      { plot: result[0], message: 'Plot updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating plot:', error);
    return NextResponse.json(
      { error: 'Failed to update plot' },
      { status: 500 }
    );
  }
}

// DELETE plot
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get plot info before deletion for logging
    const plotInfo = await queryOne(
      'SELECT plot_number FROM grave_plots WHERE id = $1',
      [id]
    );
    
    const result = await query(
      'DELETE FROM grave_plots WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Plot not found' },
        { status: 404 }
      );
    }

    // Log the plot deletion
    const { ipAddress, userAgent } = getClientInfo(request);
    await createLog({
      action: 'plot_delete',
      description: `Deleted plot ${plotInfo?.plot_number || id}`,
      resourceType: 'plot',
      resourceId: Number(id),
      ipAddress,
      userAgent,
      status: 'success',
    });

    return NextResponse.json(
      { message: 'Plot deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting plot:', error);
    return NextResponse.json(
      { error: 'Failed to delete plot' },
      { status: 500 }
    );
  }
}
