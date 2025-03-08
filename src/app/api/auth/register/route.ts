import { hash } from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isUsingSupabase } from '@/lib/env';
import db from '@/lib/db';

// Dynamically import supabaseAuthService to prevent errors when Supabase isn't available
let supabaseAuthService: any;
try {
  const supabaseAuth = require('@/lib/services/supabase-auth');
  supabaseAuthService = supabaseAuth.supabaseAuthService;
} catch (error) {
  console.warn('Supabase auth service not available');
  supabaseAuthService = {
    signUpWithEmail: () => ({ success: false, error: 'Supabase auth service not available' }),
  };
}

// Schema for validation
const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if we should forward to another backend server (original behavior)
    // This is just for backward compatibility
    if (process.env.USE_EXTERNAL_BACKEND === 'true') {
      try {
        // Forward the request to the backend server
        const response = await fetch('http://localhost:5001/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
          return NextResponse.json(
            { error: data.error || 'Failed to register' },
            { status: response.status },
          );
        }

        // Set the token in a secure HTTP-only cookie
        const headers = new Headers();
        headers.append('Set-Cookie', `token=${data.token}; HttpOnly; Path=/; SameSite=Strict`);

        return NextResponse.json(data, {
          status: 201,
          headers,
        });
      } catch (error) {
        console.error('External registration error:', error);
        // Fall through to local registration if external fails
      }
    }

    // Parse and validate request body
    const validationResult = userSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          issues: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { name, email, password } = validationResult.data;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // If using Supabase in production, register with Supabase first
    if (isUsingSupabase()) {
      const supabaseResult = await supabaseAuthService.signUpWithEmail(email, password);

      if (!supabaseResult.success) {
        return NextResponse.json(
          { error: supabaseResult.error || 'Failed to register with Supabase' },
          { status: 500 },
        );
      }

      // Successfully registered with Supabase
      console.log('User registered with Supabase:', supabaseResult.data?.user?.id);
    }


    const hashedPassword = await hash(password, 10);

    // Create default tenant for the user (trial)
    const tenant = await db.tenant.create({
      data: {
        name: 'trial',
        domain: `trial-${Date.now()}`.toLowerCase(),
        plan: 'trial',
      },
    });

    // Create user in the database
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        user_role: 'admin', // First user is admin of their tenant
        tenant_id: tenant.id,
      },
    });

    // Don't send the password back to client
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user: userWithoutPassword,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
