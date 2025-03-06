import { NextResponse } from 'next/server';
import { getSession, resetSupabaseClient } from '@/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    console.log('[PROFILE_GET] Fetching user profile');
    
    // Reset the client to ensure we get a fresh session
    resetSupabaseClient();
    
    // Use the getSession helper
    const session = await getSession();
    
    if (!session?.user) {
      console.log('[PROFILE_GET] No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('[PROFILE_GET] Valid session found for user:', userId);

    // Get user data from database
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log('[PROFILE_GET] User not found in database, using session data');
      // Return session user data as fallback
      return NextResponse.json({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role || 'user',
        tenantId: session.user.tenantId || 'trial',
        tenantName: session.user.tenantName || 'Trial',
        plan: 'free',
      });
    }

    // Get tenant data separately
    const tenant = user.tenantId ? await db.tenant.findUnique({
      where: { id: user.tenantId }
    }) : null;

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: tenant?.name || null,
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
    console.log('[PROFILE_PATCH] Updating user profile');
    
    // Reset the client to ensure we get a fresh session
    resetSupabaseClient();
    
    const session = await getSession();
    
    if (!session?.user) {
      console.log('[PROFILE_PATCH] No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const data = await req.json();
    
    console.log('[PROFILE_PATCH] Updating user:', userId, 'with data:', data);
    
    // Update user in database
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        // Add other fields as needed
      },
    });
    
    console.log('[PROFILE_PATCH] User updated successfully');
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('[PROFILE_PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
