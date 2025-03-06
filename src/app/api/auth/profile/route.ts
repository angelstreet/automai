import { NextResponse } from 'next/server';
import { getSession } from '@/auth';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { RequestCookie, ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

// Helper function to create Supabase client with different URLs
function createSupabaseClient(url: string) {
  return createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookieStore = cookies() as unknown as ReadonlyRequestCookies;
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const cookieStore = cookies() as unknown as ReadonlyRequestCookies;
          cookieStore.set(name, value, {
            ...options,
            path: options.path || '/'
          });
        },
        remove(name: string, options: CookieOptions) {
          const cookieStore = cookies() as unknown as ReadonlyRequestCookies;
          cookieStore.set(name, '', {
            ...options,
            path: options.path || '/',
            maxAge: 0
          });
        }
      }
    }
  );
}

export async function GET() {
  try {
    // Log all available cookies for debugging
    const cookieStore = cookies() as unknown as ReadonlyRequestCookies;
    const availableCookies = cookieStore.getAll();
    console.log('[PROFILE_GET] Available cookies:', 
      availableCookies.map((cookie: RequestCookie) => 
        `${cookie.name}: ${cookie.value.substring(0, 10)}...`
      )
    );

    // Try different Supabase URLs
    const urls = [
      'http://localhost:54321',
      'http://127.0.0.1:54321',
      ...Array.from({ length: 4 }, (_, i) => `http://localhost:${3000 + i}`),
      ...Array.from({ length: 4 }, (_, i) => `http://127.0.0.1:${3000 + i}`)
    ];

    // Create clients for all URLs
    const clients = urls.map(url => createSupabaseClient(url));

    // Try to get session from each client
    const sessions = await Promise.all(
      clients.map(client => client.auth.getSession())
    );

    // Log session check results
    console.log('[PROFILE_GET] Session check:', 
      sessions.map((s, i) => ({ 
        url: urls[i], 
        hasSession: !!s.data.session 
      }))
    );

    // Find first valid session
    const validSession = sessions.find(s => s.data.session)?.data.session;

    if (!validSession?.user) {
      console.log('[PROFILE_GET] No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = validSession.user.id;
    console.log('[PROFILE_GET] Valid session found for user:', userId);

    // Get user data from database
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log('[PROFILE_GET] User not found in database, using session data');
      // Return session user data as fallback
      return NextResponse.json({
        id: validSession.user.id,
        name: validSession.user.user_metadata?.name || validSession.user.email?.split('@')[0] || 'User',
        email: validSession.user.email,
        role: validSession.user.user_metadata?.role || 'user',
        tenantId: validSession.user.user_metadata?.tenantId || 'trial',
        tenantName: validSession.user.user_metadata?.tenantName || 'Trial',
        plan: 'free',
      });
    }

    // Get tenant data separately
    const tenant = user.tenantId ? await db.tenant.findUnique({
      where: { id: user.tenantId }
    }) : null;

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: tenant?.name || null,
      plan: tenant?.plan || 'free',
    });
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
      role: updatedUser.role,
    });
  } catch (error) {
    console.error('[PROFILE_PATCH]', error);
    return new NextResponse(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}
