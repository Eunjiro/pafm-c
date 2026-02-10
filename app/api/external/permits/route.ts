import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { requireApiKey, getApiKeyInfo } from '@/lib/api-auth';
import { createLog, getClientInfo } from '@/lib/logger';

// Validation schema for incoming permit
const permitSchema = z.object({
  permit_id: z.string().min(1),
  permit_type: z.enum(['burial', 'exhumation', 'niche', 'entrance']),
  
  // Deceased information
  deceased_first_name: z.string().min(1),
  deceased_middle_name: z.string().optional(),
  deceased_last_name: z.string().min(1),
  deceased_suffix: z.string().optional(),
  date_of_birth: z.string().optional(),
  date_of_death: z.string(),
  gender: z.string().optional(),
  
  // Applicant information
  applicant_name: z.string().min(1),
  applicant_email: z.string().email().optional(),
  applicant_phone: z.string().optional(),
  relationship_to_deceased: z.string().optional(),
  
  // Plot preferences
  preferred_cemetery_id: z.number().optional(),
  preferred_plot_id: z.number().optional(),
  preferred_section: z.string().optional(),
  preferred_layer: z.number().optional(),
  
  // Permit details
  permit_approved_at: z.string(),
  permit_expiry_date: z.string().optional(),
  permit_document_url: z.string().url().optional(),
  
  // Additional metadata
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * POST /api/external/permits
 * Webhook endpoint to receive approved permits from permit system
 */
export async function POST(request: NextRequest) {
  // Verify API key
  const authError = await requireApiKey(request);
  if (authError) return authError;
  
  try {
    const body = await request.json();
    const validated = permitSchema.parse(body);
    
    // Check if permit already exists
    const existing = await query(
      'SELECT id, status FROM pending_permits WHERE permit_id = $1',
      [validated.permit_id]
    );
    
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'Permit already exists',
          permit_id: validated.permit_id,
          status: existing[0].status,
        },
        { status: 409 }
      );
    }
    
    // Validate plot if specified
    if (validated.preferred_plot_id) {
      const plotCheck = await query(
        'SELECT id, status, plot_number FROM grave_plots WHERE id = $1',
        [validated.preferred_plot_id]
      );
      
      if (plotCheck.length === 0) {
        return NextResponse.json(
          { error: 'Preferred plot not found' },
          { status: 400 }
        );
      }
    }
    
    // Insert pending permit
    const result = await query(
      `INSERT INTO pending_permits (
        permit_id, permit_type,
        deceased_first_name, deceased_middle_name, deceased_last_name, deceased_suffix,
        date_of_birth, date_of_death, gender,
        applicant_name, applicant_email, applicant_phone, relationship_to_deceased,
        preferred_cemetery_id, preferred_plot_id, preferred_section, preferred_layer,
        permit_approved_at, permit_expiry_date, permit_document_url,
        metadata, status
      ) VALUES (
        $1, $2,
        $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20,
        $21, 'pending'
      ) RETURNING *`,
      [
        validated.permit_id,
        validated.permit_type,
        validated.deceased_first_name,
        validated.deceased_middle_name || null,
        validated.deceased_last_name,
        validated.deceased_suffix || null,
        validated.date_of_birth || null,
        validated.date_of_death,
        validated.gender || null,
        validated.applicant_name,
        validated.applicant_email || null,
        validated.applicant_phone || null,
        validated.relationship_to_deceased || null,
        validated.preferred_cemetery_id || null,
        validated.preferred_plot_id || null,
        validated.preferred_section || null,
        validated.preferred_layer || null,
        validated.permit_approved_at,
        validated.permit_expiry_date || null,
        validated.permit_document_url || null,
        JSON.stringify(validated.metadata || {}),
      ]
    );
    
    // Log the permit receipt
    const apiKey = await getApiKeyInfo(request);
    const { ipAddress, userAgent } = getClientInfo(request);
    
    await createLog({
      userId: undefined,
      action: 'permit_received',
      description: `Received ${validated.permit_type} permit ${validated.permit_id} for ${validated.deceased_first_name} ${validated.deceased_last_name} from ${apiKey?.system_name || 'external system'}`,
      resourceType: 'permit',
      resourceId: result[0].id,
      ipAddress,
      userAgent,
      status: 'success',
    });
    
    return NextResponse.json(
      {
        message: 'Permit received successfully',
        permit: {
          id: result[0].id,
          permit_id: result[0].permit_id,
          status: result[0].status,
          created_at: result[0].created_at,
        },
      },
      { status: 201 }
    );
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error receiving permit:', error);
    return NextResponse.json(
      { error: 'Failed to process permit' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/external/permits/:permit_id
 * Check status of a submitted permit
 */
export async function GET(request: NextRequest) {
  // Verify API key
  const authError = await requireApiKey(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url);
    const permitId = searchParams.get('permit_id');
    
    if (!permitId) {
      return NextResponse.json(
        { error: 'permit_id parameter required' },
        { status: 400 }
      );
    }
    
    const result = await query(
      `SELECT 
        pp.*,
        gp.plot_number as assigned_plot_number,
        c.name as assigned_cemetery_name,
        u.email as assigned_by_email
      FROM pending_permits pp
      LEFT JOIN grave_plots gp ON pp.assigned_plot_id = gp.id
      LEFT JOIN cemeteries c ON gp.cemetery_id = c.id
      LEFT JOIN users u ON pp.assigned_by = u.id
      WHERE pp.permit_id = $1`,
      [permitId]
    );
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Permit not found' },
        { status: 404 }
      );
    }
    
    const permit = result[0];
    
    return NextResponse.json({
      permit: {
        id: permit.id,
        permit_id: permit.permit_id,
        permit_type: permit.permit_type,
        status: permit.status,
        deceased_name: `${permit.deceased_first_name} ${permit.deceased_last_name}`,
        applicant_name: permit.applicant_name,
        assigned_plot: permit.assigned_plot_number || null,
        assigned_cemetery: permit.assigned_cemetery_name || null,
        assigned_at: permit.assigned_at,
        assigned_by: permit.assigned_by_email,
        rejection_reason: permit.rejection_reason,
        created_at: permit.created_at,
        updated_at: permit.updated_at,
      },
    });
    
  } catch (error) {
    console.error('Error fetching permit:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permit' },
      { status: 500 }
    );
  }
}
