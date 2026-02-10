import { query } from './db';

export interface LogEntry {
  userId?: number;
  userEmail?: string;
  action: string;
  description?: string;
  resourceType?: string;
  resourceId?: number;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'error' | 'warning';
}

export async function createLog(entry: LogEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO system_logs 
        (user_id, user_email, action, description, resource_type, resource_id, ip_address, user_agent, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.userId || null,
        entry.userEmail || null,
        entry.action,
        entry.description || null,
        entry.resourceType || null,
        entry.resourceId || null,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.status || 'success',
      ]
    );
  } catch (error) {
    console.error('Failed to create log entry:', error);
    // Don't throw - logging failures shouldn't break the main operation
  }
}

export function getClientInfo(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
}
