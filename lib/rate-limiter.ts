import { RateLimiterMemory } from 'rate-limiter-flexible';
import { query } from './db';

// Rate limiter for login attempts
// Allows 10 attempts per 15 minutes per IP (increased for admins)
export const loginRateLimiter = new RateLimiterMemory({
  points: 10, // Number of attempts
  duration: 15 * 60, // Per 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes if exceeded
});

// Get client IP from request
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback
  return 'unknown';
}

// Check if IP should be blocked based on database records
export async function checkLoginAttempts(ip: string): Promise<{ blocked: boolean; attempts: number }> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count 
     FROM login_attempts 
     WHERE ip_address = $1 
     AND attempt_time > $2 
     AND success = false`,
    [ip, fifteenMinutesAgo]
  );
  
  const attempts = parseInt(result[0]?.count || '0');
  const blocked = attempts >= 10;
  
  return { blocked, attempts };
}
