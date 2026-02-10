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
        cs.name as preferred_section_name,
        gp.plot_number as preferred_plot_number,
        assigned_gp.plot_number as assigned_plot_number,
        assigned_c.name as assigned_cemetery_name,
        u.email as assigned_by_email
      FROM pending_permits pp
      LEFT JOIN cemeteries c ON pp.preferred_cemetery_id = c.id
      LEFT JOIN cemetery_sections cs ON pp.section_id = cs.id
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
          section_name: p.preferred_section_name,
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

/**
 * PUT /api/permits/:id
 * Update permit (assign, reject, add notes)
 */
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    const body = await request.json();
    const { action, plot_id, layer, admin_notes, rejection_reason } = body;
    
    // Get user from JWT
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as number;
    
    // Get permit
    const permits = await query(
      'SELECT * FROM pending_permits WHERE id = $1',
      [id]
    );
    
    if (permits.length === 0) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
    }
    
    const permit = permits[0];
    
    if (action === 'assign') {
      // Assign burial to plot
      if (!plot_id) {
        return NextResponse.json({ error: 'plot_id required' }, { status: 400 });
      }
      
      // Check plot availability
      const plots = await query(
        'SELECT * FROM grave_plots WHERE id = $1',
        [plot_id]
      );
      
      if (plots.length === 0) {
        return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
      }
      
      // Create deceased person if not exists
      const deceasedResult = await query(
        `INSERT INTO deceased_persons (
          first_name, middle_name, last_name, suffix,
          date_of_birth, date_of_death, gender
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          permit.deceased_first_name,
          permit.deceased_middle_name,
          permit.deceased_last_name,
          permit.deceased_suffix,
          permit.date_of_birth,
          permit.date_of_death,
          permit.gender,
        ]
      );
      
      const deceasedId = deceasedResult[0].id;
      
      // Create burial
      const burialResult = await query(
        `INSERT INTO burials (
          plot_id, deceased_id, layer, burial_date, permit_number
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id`,
        [plot_id, deceasedId, layer || 1, permit.date_of_death, permit.permit_id]
      );
      
      const burialId = burialResult[0].id;
      
      // Update permit status
      await query(
        `UPDATE pending_permits 
        SET status = 'assigned',
            assigned_plot_id = $1,
            assigned_by = $2,
            assigned_at = CURRENT_TIMESTAMP,
            burial_id = $3,
            admin_notes = $4
        WHERE id = $5`,
        [plot_id, userId, burialId, admin_notes || null, id]
      );
      
      // Log the assignment
      const { ipAddress, userAgent } = getClientInfo(request);
      await createLog({
        userId,
        action: 'permit_assigned',
        description: `Assigned permit ${permit.permit_id} to plot ${plots[0].plot_number}`,
        resourceType: 'permit',
        resourceId: parseInt(id),
        ipAddress,
        userAgent,
        status: 'success',
      });
      
      return NextResponse.json({
        message: 'Permit assigned successfully',
        burial_id: burialId,
      });
      
    } else if (action === 'reject') {
      // Reject permit
      await query(
        `UPDATE pending_permits 
        SET status = 'rejected',
            rejection_reason = $1,
            assigned_by = $2,
            assigned_at = CURRENT_TIMESTAMP,
            admin_notes = $3
        WHERE id = $4`,
        [rejection_reason || 'No reason provided', userId, admin_notes || null, id]
      );
      
      // Log the rejection
      const { ipAddress, userAgent } = getClientInfo(request);
      await createLog({
        userId,
        action: 'permit_rejected',
        description: `Rejected permit ${permit.permit_id}: ${rejection_reason}`,
        resourceType: 'permit',
        resourceId: parseInt(id),
        ipAddress,
        userAgent,
        status: 'success',
      });
      
      return NextResponse.json({ message: 'Permit rejected' });
      
    } else if (action === 'update_notes') {
      // Update admin notes
      await query(
        'UPDATE pending_permits SET admin_notes = $1 WHERE id = $2',
        [admin_notes, id]
      );
      
      return NextResponse.json({ message: 'Notes updated' });
      
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error updating permit:', error);
    return NextResponse.json(
      { error: 'Failed to update permit' },
      { status: 500 }
    );
  }
}
