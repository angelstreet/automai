import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

/**
 * This route handles OAuth callback requests from Supabase Auth.
 * It is needed for processing OAuth provider redirects.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // If there's no code, redirect to login
  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Create a Supabase client for handling the callback
  const supabase = createRouteHandlerClient({ cookies });
  
  // Exchange the code for a session
  await supabase.auth.exchangeCodeForSession(code);
  
  // Redirect to the auth-redirect page which will handle session validation
  return NextResponse.redirect(new URL('/auth-redirect', request.url));
}