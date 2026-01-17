import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query, queryOne } from '@/lib/db';

const cemeterySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  description: z.string().optional(),
  total_area: z.number().positive().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  established_year: z.number().int().min(1000).max(9999).optional(),
  is_active: z.boolean().default(true),
  map_coordinates: z.array(z.array(z.number())).optional(), // [[lat, lng], [lat, lng], ...]
});

// GET all cemeteries
export async function GET() {
  try {
    const cemeteries = await query(`
      SELECT * FROM cemeteries 
      ORDER BY name ASC
    `);

    return NextResponse.json({ cemeteries }, { status: 200 });
  } catch (error) {
    console.error('Error fetching cemeteries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cemeteries' },
      { status: 500 }
    );
  }
}

// POST create new cemetery
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validatedData = cemeterySchema.parse(body);

    const result = await query(
      `INSERT INTO cemeteries (
        name, address, city, state, country, postal_code, description,
        total_area, latitude, longitude, established_year, is_active, map_coordinates
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        validatedData.name,
        validatedData.address,
        validatedData.city,
        validatedData.state,
        validatedData.country,
        validatedData.postal_code,
        validatedData.description,
        validatedData.total_area,
        validatedData.latitude,
        validatedData.longitude,
        validatedData.established_year,
        validatedData.is_active,
        validatedData.map_coordinates ? JSON.stringify(validatedData.map_coordinates) : null,
      ]
    );

    return NextResponse.json(
      { cemetery: result[0], message: 'Cemetery created successfully' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating cemetery:', error);
    return NextResponse.json(
      { error: 'Failed to create cemetery' },
      { status: 500 }
    );
  }
}
