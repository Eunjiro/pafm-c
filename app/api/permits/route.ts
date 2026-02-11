import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { createLog, getClientInfo } from '@/lib/logger';
import { jwtVerify } from 'jose';

/**
 * GET /api/permits
 * List pending permits for admin review
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const permitType = searchParams.get('type');
    const cemeteryId = searchParams.get('cemetery_id');
    
    let sql = `
      SELECT 
        pp.*,
        c.name as preferred_cemetery_name,
        gp.plot_number as preferred_plot_number,
        assigned_gp.plot_number as assigned_plot_number,
        assigned_c.name as assigned_cemetery_name,
        u.email as assigned_by_email
      FROM pending_permits pp
      LEFT JOIN cemeteries c ON pp.preferred_cemetery_id = c.id
      LEFT JOIN grave_plots gp ON pp.preferred_plot_id = gp.id
      LEFT JOIN grave_plots assigned_gp ON pp.assigned_plot_id = assigned_gp.id
      LEFT JOIN cemeteries assigned_c ON assigned_gp.cemetery_id = assigned_c.id
      LEFT JOIN users u ON pp.assigned_by = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status && status !== 'all') {
      sql += ` AND pp.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (permitType) {
      sql += ` AND pp.permit_type = $${paramIndex++}`;
      params.push(permitType);
    }
    
    if (cemeteryId) {
      sql += ` AND pp.preferred_cemetery_id = $${paramIndex++}`;
      params.push(cemeteryId);
    }
    
    sql += ` ORDER BY pp.created_at DESC`;
    
    const permits = await query(sql, params);
    
    return NextResponse.json({
      permits: permits.map((p: any) => ({
        id: p.id,
        permit_id: p.permit_id,
        permit_type: p.permit_type,
        status: p.status,
        deceased: {
          first_name: p.deceased_first_name,
          middle_name: p.deceased_middle_name,
          last_name: p.deceased_last_name,
          suffix: p.deceased_suffix,
          date_of_birth: p.date_of_birth,
          date_of_death: p.date_of_death,
          gender: p.gender,
        },
        applicant: {
          name: p.applicant_name,
          email: p.applicant_email,
          phone: p.applicant_phone,
          relationship: p.relationship_to_deceased,
        },
        preferences: {
          cemetery_id: p.preferred_cemetery_id,
          cemetery_name: p.preferred_cemetery_name,
          section: p.preferred_section,
          plot_id: p.preferred_plot_id,
          plot_number: p.preferred_plot_number,
          layer: p.preferred_layer,
        },
        assignment: {
          plot_id: p.assigned_plot_id,
          plot_number: p.assigned_plot_number,
          cemetery_name: p.assigned_cemetery_name,
          burial_id: p.burial_id,
          assigned_by: p.assigned_by_email,
          assigned_at: p.assigned_at,
        },
        permit_info: {
          approved_at: p.permit_approved_at,
          expiry_date: p.permit_expiry_date,
          document_url: p.permit_document_url,
        },
        admin_notes: p.admin_notes,
        rejection_reason: p.rejection_reason,
        created_at: p.created_at,
        updated_at: p.updated_at,
        metadata: p.metadata,
      })),
    });
    
  } catch (error) {
    console.error('Error fetching permits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permits' },
      { status: 500 }
    );
  }
}
