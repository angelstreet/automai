import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// This route is deprecated and only kept for backward compatibility
// All authentication is now handled directly through Supabase

export async function GET(request: Request) {
  return NextResponse.json({ message: 'Auth is now handled directly through Supabase' });
}

export async function POST(request: Request) {
  return NextResponse.json({ message: 'Auth is now handled directly through Supabase' });
}
