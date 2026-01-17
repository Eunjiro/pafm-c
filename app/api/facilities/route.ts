import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cemeteryId = searchParams.get('cemetery_id');

    if (!cemeteryId) {
      return NextResponse.json(
        { error: 'Cemetery ID is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'SELECT * FROM facilities WHERE cemetery_id = $1 ORDER BY facility_type, name',
      [cemeteryId]
    );

    return NextResponse.json({ facilities: result.rows });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facilities' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      cemetery_id,
      name,
      facility_type,
      description,
      map_coordinates,
      latitude,
      longitude,
    } = body;

    if (!cemetery_id || !name || !facility_type || !map_coordinates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO facilities 
       (cemetery_id, name, facility_type, description, map_coordinates, latitude, longitude) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [cemetery_id, name, facility_type, description, JSON.stringify(map_coordinates), latitude, longitude]
    );

    return NextResponse.json(
      { facility: result.rows[0], message: 'Facility created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating facility:', error);
    return NextResponse.json(
      { error: 'Failed to create facility' },
      { status: 500 }
    );
  }
}
