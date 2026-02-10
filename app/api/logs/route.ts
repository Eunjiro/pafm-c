import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const status = searchParams.get('status');
    const resourceType = searchParams.get('resource_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (action) {
      conditions.push(`action = $${paramIndex}`);
      params.push(action);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (resourceType) {
      conditions.push(`resource_type = $${paramIndex}`);
      params.push(resourceType);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(
        user_email ILIKE $${paramIndex} OR 
        description ILIKE $${paramIndex} OR 
        action ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM system_logs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0].total);

    // Get logs
    const logsResult = await query(
      `SELECT 
        id, 
        user_id, 
        user_email, 
        action, 
        description, 
        resource_type, 
        resource_id, 
        ip_address, 
        status, 
        created_at
       FROM system_logs 
       WHERE ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      logs: logsResult,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    
    // If table doesn't exist, return empty data
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('relation "system_logs" does not exist')) {
      return NextResponse.json({
        logs: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
        message: 'Logs table not initialized. Please run: npm run db:migrate:logs',
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

// Get unique values for filters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'filters') {
      const [actionsResult, resourceTypesResult] = await Promise.all([
        query<{ action: string }>('SELECT DISTINCT action FROM system_logs WHERE action IS NOT NULL ORDER BY action'),
        query<{ resource_type: string }>('SELECT DISTINCT resource_type FROM system_logs WHERE resource_type IS NOT NULL ORDER BY resource_type'),
      ]);

      return NextResponse.json({
        actions: actionsResult.map((r) => r.action),
        resourceTypes: resourceTypesResult.map((r) => r.resource_type),
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error processing request:', error);
    
    // If table doesn't exist, return empty arrays
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('relation "system_logs" does not exist')) {
      return NextResponse.json({
        actions: [],
        resourceTypes: [],
        message: 'Logs table not initialized. Please run: npm run db:migrate:logs',
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
