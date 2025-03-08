import { NextResponse } from 'next/server';
import { getSession, extractSessionFromHeader } from '@/auth';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    console.log('[PROFILE_GET] Fetching user profile');

    // Try to get session from Authorization header first
    const authHeader = request.headers.get('Authorization');
    let session = null;

    if (authHeader) {
      console.log('[PROFILE_GET] Authorization header present, extracting session');
      session = await extractSessionFromHeader(authHeader);
    }

    // Fall back to cookie-based session if header auth fails
    if (!session) {
      console.log('[PROFILE_GET] No session from header, trying cookie-based session');
      session = await getSession();
    }

    // Check if we have a valid session
    if (!session?.user) {
      console.log('[PROFILE_GET] No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('[PROFILE_GET] Valid session found for user:', userId);

    // Get user data from database
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log('[PROFILE_GET] User not found in database, creating user');

      // Try to create the user
      try {
        // Check if tenant exists, create if not
        let tenant = await db.tenant.findUnique({
          where: { id: 'trial' },
        });

        if (!tenant) {
          console.log('[PROFILE_GET] Creating trial tenant');
          tenant = await db.tenant.create({
            data: {
              id: 'trial',
              name: 'trial',
              plan: 'free',
            },
          });
        }

        // Create user with admin role by default
        const newUser = await db.user.create({
          data: {
            id: userId,
            email: session.user.email,
            name: session.user.name || session.user.email?.split('@')[0] || 'User',
            user_role: session.user.user_role || 'admin', // Default to admin role
            tenant_id: (session.user.tenant_id || 'trial').toLowerCase(),
          },
        });

        console.log('[PROFILE_GET] User created:', newUser.id);

        // Return the newly created user
        return NextResponse.json({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          user_role: newUser.user_role,
          tenant_id: newUser.tenant_id,
          tenant_name: 'trial',
          plan: 'free',
        });
      } catch (createError) {
        console.error('[PROFILE_GET] Error creating user:', createError);
        // Return session user data as fallback even if creation fails
        return NextResponse.json({
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          user_role: session.user.user_role || 'admin', // Default to admin role
          tenant_id: (session.user.tenant_id || 'trial').toLowerCase(),
          tenant_name: (session.user.tenant_name || 'trial').toLowerCase(),
          plan: 'free',
        });
      }
    }

    // Get tenant data separately
    const tenant = user.tenant_id
      ? await db.tenant.findUnique({
          where: { id: user.tenant_id },
        })
      : null;

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      user_role: user.user_role,
      tenant_id: user.tenant_id,
      tenant_name: tenant?.name || null,
      plan: tenant?.plan || 'free',
    };

    console.log('[PROFILE_GET] Returning user data:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[PROFILE_GET] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return new NextResponse(JSON.stringify({ error: 'Name is required' }), { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { name },
    });

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      user_role: updatedUser.user_role,
    });
  } catch (error) {
    console.error('[PROFILE_PATCH]', error);
    return new NextResponse(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}
