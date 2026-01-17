import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { loginSchema } from '@/lib/validation';
import { loginRateLimiter, getClientIp } from '@/lib/rate-limiter';
import { queryOne, query } from '@/lib/db';

// Secret key for JWT (in production, use environment variable)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// User type from database
interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  is_active: boolean;
  last_login: Date | null;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request);

    // Apply rate limiting
    try {
      await loginRateLimiter.consume(clientIp);
    } catch (rateLimitError) {
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: 900, // 15 minutes in seconds
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    
    let validatedData;
    try {
      validatedData = loginSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid input',
            details: error.issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { email, password } = validatedData;

    // Find user by email (case-insensitive) from database
    const user = await queryOne<User>(
      'SELECT id, email, password_hash, name, role, is_active, last_login FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    // Generic error message to prevent user enumeration
    const invalidCredentialsError = 'Invalid email or password';

    if (!user) {
      // Still run bcrypt to prevent timing attacks
      await bcrypt.compare(password, '$2a$10$dummy.hash.to.prevent.timing.attacks');
      
      // Log failed attempt to database
      await query(
        'INSERT INTO login_attempts (ip_address, success) VALUES ($1, $2)',
        [clientIp, false]
      );
      
      return NextResponse.json(
        { error: invalidCredentialsError },
        { status: 401 }
      );
    }

    // Check if user account is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Log failed attempt to database
      await query(
        'INSERT INTO login_attempts (ip_address, success) VALUES ($1, $2)',
        [clientIp, false]
      );
      
      return NextResponse.json(
        { error: invalidCredentialsError },
        { status: 401 }
      );
    }

    // Log successful login attempt
    await query(
      'INSERT INTO login_attempts (ip_address, success) VALUES ($1, $2)',
      [clientIp, true]
    );

    // Update last login timestamp
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Create JWT token
    const token = await new SignJWT({
      userId: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    // Create response with secure cookie
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 200 }
    );

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
