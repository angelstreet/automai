import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error('[PROFILE_GET] No session or user found');
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    console.log('[PROFILE_GET] Session found, user ID:', session.user.id);

    // Get full user data from database
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true },
    });

    if (!user) {
      console.error('[PROFILE_GET] User not found in database for ID:', session.user.id);

      // Return the session user data as fallback instead of 404
      return NextResponse.json({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role || 'user',
        tenantId: session.user.tenantId || null,
        tenantName: null,
        plan: 'free',
      });
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
    console.error('[PROFILE_GET]', error);
    return new NextResponse(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

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
