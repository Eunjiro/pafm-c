import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createLog, getClientInfo } from '@/lib/logger';
import { jwtVerify } from 'jose';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PUT /api/permits/[id]
 * Update permit (assign, reject,add notes)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, plot_id, layer, admin_notes, rejection_reason, deceased_id, burial_id } = body;
    
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
    
    if (action === 'link_burial') {
      // Link an existing burial to this permit (used when assigning from cemetery map)
      if (!burial_id || !deceased_id || !plot_id) {
        return NextResponse.json({ 
          error: 'burial_id, deceased_id, and plot_id required for link_burial action' 
        }, { status: 400 });
      }
      
      // Convert IDs to integers to ensure proper types
      const plotIdInt = typeof plot_id === 'string' ? parseInt(plot_id) : plot_id;
      const burialIdInt = typeof burial_id === 'string' ? parseInt(burial_id) : burial_id;
      const permitIdInt = parseInt(id);
      
      console.log('🔍 Link burial - Data types:', {
        plot_id: plotIdInt,
        burial_id: burialIdInt,
        permit_id: permitIdInt,
        userId,
        admin_notes: admin_notes || null
      });
      
      // Update permit status to link to existing burial
      await query(
        `UPDATE pending_permits 
        SET status = 'assigned',
            assigned_plot_id = $1,
            assigned_by = $2,
            assigned_at = CURRENT_TIMESTAMP,
            burial_id = $3,
            admin_notes = $4
        WHERE id = $5`,
        [plotIdInt, userId, burialIdInt, admin_notes || null, permitIdInt]
      );
      
      // Log the assignment
      const { ipAddress, userAgent } = getClientInfo(request);
      await createLog({
        userId,
        action: 'permit_linked',
        description: `Linked permit ${permit.permit_id} to existing burial`,
        resourceType: 'permit',
        resourceId: parseInt(id),
        ipAddress,
        userAgent,
        status: 'success',
      });
      
      return NextResponse.json({
        message: 'Permit linked to burial successfully',
        burial_id,
      });
      
    } else if (action === 'assign') {
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
    console.error('❌ Error updating permit:', error);
    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    const errorCode = (error as any)?.code;
    const errorDetail = (error as any)?.detail;
    
    console.error('Error details:', { 
      errorMessage, 
      errorCode,
      errorDetail,
      errorStack 
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to update permit',
        message: errorMessage,
        code: errorCode,
        detail: errorDetail,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
