import { NextResponse } from 'next/server';
import { getSession } from '@/auth';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET() {
  try {
    // Get session from both methods to debug which one works
    const session = await getSession();
    
    // Also try direct Supabase session check
    const cookieStore = cookies();
    
    // Log all cookies for debugging
    console.log('[PROFILE_GET] Available cookies:', 
      cookieStore.getAll().map(c => `${c.name}: ${c.value.substring(0, 10)}...`)
    );
    
    // Try with localhost URL
    const supabaseLocal = createServerClient(
      'http://localhost:54321',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: (name, value, options) => {
            cookieStore.set(name, value, options);
          },
          remove: (name, options) => {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );
    
    // Try with 127.0.0.1 URL
    const supabaseIP = createServerClient(
      'http://127.0.0.1:54321',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: (name, value, options) => {
            cookieStore.set(name, value, options);
          },
          remove: (name, options) => {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );
    
    // Check both clients
    const { data: localData } = await supabaseLocal.auth.getSession();
    const { data: ipData } = await supabaseIP.auth.getSession();
    
    console.log('[PROFILE_GET] Auth check:', { 
      sessionExists: !!session,
      localhostSessionExists: !!localData.session,
      ipSessionExists: !!ipData.session,
      userId: session?.user?.id || localData?.session?.user?.id || ipData?.session?.user?.id || 'none'
    });

    // Use any session source that works
    const userId = session?.user?.id || localData?.session?.user?.id || ipData?.session?.user?.id;
    const supabaseUser = localData?.session?.user || ipData?.session?.user;
    
    if (!userId) {
      console.error('[PROFILE_GET] No valid user ID found in any session');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    console.log('[PROFILE_GET] Session found, user ID:', userId);

    // Get full user data from database
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      console.error('[PROFILE_GET] User not found in database for ID:', userId);

      // Get Supabase user metadata as fallback
      if (supabaseUser) {
        console.log('[PROFILE_GET] Using Supabase user data as fallback');
        
        // Return the session user data as fallback instead of 404
        return NextResponse.json({
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
          email: supabaseUser.email,
          role: supabaseUser.user_metadata?.role || 'user',
          tenantId: supabaseUser.user_metadata?.tenantId || 'trial',
          tenantName: supabaseUser.user_metadata?.tenantName || 'Trial',
          plan: 'free',
        });
      }
      
      return new NextResponse(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name || null,
      plan: user.tenant?.plan || 'free',
    });
  } catch (error) {
    console.error('[PROFILE_GET] Error details:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal error' }), { status: 500 });
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
