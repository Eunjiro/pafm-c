import { NextRequest, NextResponse } from 'next/server';
import { query } from './db';

interface APIKey {
  id: number;
  key_name: string;
  system_name: string;
  is_active: boolean;
  permissions: {
    read: boolean;
    write: boolean;
    endpoints?: string[];
  };
  allowed_ips?: string[];
  last_used_at: string | null;
  expires_at?: string | null;
}

/**
 * Verify API key from Authorization header
 */
export async function verifyApiKey(request: NextRequest): Promise<{
  valid: boolean;
  apiKey?: APIKey;
  error?: string;
}> {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return { valid: false, error: 'Missing Authorization header' };
    }
    
    // Support both "Bearer <key>" and plain "<key>" formats
    const apiKeyValue = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;
    
    if (!apiKeyValue || !apiKeyValue.startsWith('pk_')) {
      return { valid: false, error: 'Invalid API key format' };
    }
    
    // Look up API key in database
    const result = await query(
      'SELECT * FROM api_keys WHERE api_key = $1 AND is_active = true',
      [apiKeyValue]
    );
    
    if (result.length === 0) {
      return { valid: false, error: 'Invalid or inactive API key' };
    }
    
    const apiKey: APIKey = result[0];
    
    // Check expiration
    if (apiKey.expires_at) {
      const expiresAt = new Date(apiKey.expires_at);
      if (expiresAt < new Date()) {
        return { valid: false, error: 'API key has expired' };
      }
    }
    
    // Check IP whitelist if configured
    if (apiKey.allowed_ips && apiKey.allowed_ips.length > 0) {
      const clientIp = getClientIp(request);
      if (clientIp && !apiKey.allowed_ips.includes(clientIp)) {
        return { valid: false, error: 'IP address not allowed' };
      }
    }
    
    // Update last_used_at timestamp (fire and forget)
    query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [apiKey.id]
    ).catch(err => console.error('Failed to update last_used_at:', err));
    
    return { valid: true, apiKey };
    
  } catch (error) {
    console.error('API key verification error:', error);
    return { valid: false, error: 'Internal server error' };
  }
}

/**
 * Check if API key has permission for specific endpoint
 */
export function checkPermission(
  apiKey: APIKey,
  method: string,
  path: string
): boolean {
  const permissions = apiKey.permissions;
  
  // Check read/write permissions
  if (method === 'GET' && !permissions.read) {
    return false;
  }
  
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && !permissions.write) {
    return false;
  }
  
  // Check specific endpoint permissions if defined
  if (permissions.endpoints && permissions.endpoints.length > 0) {
    const endpointPattern = `${method} ${path}`;
    const allowed = permissions.endpoints.some(endpoint => {
      // Support wildcard matching
      const regex = new RegExp(
        '^' + endpoint.replace(/\*/g, '.*').replace(/:\w+/g, '[^/]+') + '$'
      );
      return regex.test(endpointPattern);
    });
    
    if (!allowed) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const real = request.headers.get('x-real-ip');
  if (real) {
    return real;
  }
  
  return null;
}

/**
 * Middleware to protect external API routes
 */
export async function requireApiKey(request: NextRequest) {
  const verification = await verifyApiKey(request);
  
  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Check endpoint permission
  const path = new URL(request.url).pathname;
  const hasPermission = checkPermission(
    verification.apiKey!,
    request.method,
    path
  );
  
  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Insufficient permissions for this endpoint' },
      { status: 403 }
    );
  }
  
  return null; // Allow request to proceed
}

/**
 * Helper to get API key info from request (after verification)
 */
export async function getApiKeyInfo(
  request: NextRequest
): Promise<APIKey | null> {
  const verification = await verifyApiKey(request);
  return verification.valid ? verification.apiKey! : null;
}
