import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';

const deceasedSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  middle_name: z.string().max(100).optional(),
  maiden_name: z.string().max(100).optional(),
  date_of_birth: z.string().nullable().optional(),
  date_of_death: z.string().min(1),
  age_at_death: z.number().int().positive().optional(),
  gender: z.string().max(20).optional(),
  nationality: z.string().max(100).optional(),
  occupation: z.string().max(255).optional(),
  biography: z.string().optional(),
  photo_url: z.string().max(500).optional(),
  epitaph: z.string().optional(),
});

// GET all deceased
export async function GET(request: NextRequest) {
  try {
    const deceased = await query(
      `SELECT id, first_name, last_name, middle_name, maiden_name, date_of_birth, date_of_death, 
              age_at_death, gender, nationality, occupation, biography, photo_url, epitaph
       FROM deceased 
       ORDER BY last_name, first_name ASC`
    );

    return NextResponse.json({ deceased }, { status: 200 });
  } catch (error) {
    console.error('Error fetching deceased:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deceased records' },
      { status: 500 }
    );
  }
}

// POST create new deceased record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = deceasedSchema.parse(body);

    const result = await query(
      `INSERT INTO deceased (
        first_name, last_name, middle_name, maiden_name, date_of_birth, date_of_death,
        age_at_death, gender, nationality, occupation, biography, photo_url, epitaph
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        validatedData.first_name,
        validatedData.last_name,
        validatedData.middle_name || null,
        validatedData.maiden_name || null,
        validatedData.date_of_birth || null,
        validatedData.date_of_death,
        validatedData.age_at_death || null,
        validatedData.gender || null,
        validatedData.nationality || null,
        validatedData.occupation || null,
        validatedData.biography || null,
        validatedData.photo_url || null,
        validatedData.epitaph || null,
      ]
    );

    return NextResponse.json(
      { deceased: result[0], message: 'Deceased record created successfully' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating deceased record:', error);
    return NextResponse.json(
      { error: 'Failed to create deceased record' },
      { status: 500 }
    );
  }
}
