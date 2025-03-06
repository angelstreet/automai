import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * This route handles OAuth callback requests from Supabase Auth.
 * It is needed for processing OAuth provider redirects.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  // Log information about the request for debugging
  console.log('Auth callback received:', {
    url: request.url,
    hasCode: !!code,
    cookies: cookies().getAll().map(c => c.name),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      SUPABASE_AUTH_CALLBACK_URL: process.env.SUPABASE_AUTH_CALLBACK_URL
    }
  });

  // If there's no code, redirect to login
  if (!code) {
    return NextResponse.redirect(new URL('/en/login', request.url));
  }

  // Create a Supabase client for handling the callback
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookies().get(name)?.value,
        set: (name, value, options) => cookies().set({ name, value, ...options }),
        remove: (name, options) => cookies().set({ name, value: '', ...options }),
      },
    },
  );

  try {
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/en/login?error=' + encodeURIComponent(error.message), request.url));
    }

    // Get session to verify success
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No session after code exchange');
      return NextResponse.redirect(new URL('/en/login?error=Authentication failed', request.url));
    }

    console.log('Successfully authenticated user:', {
      userId: session.user.id,
      email: session.user.email,
    });

    // Always redirect to the auth-redirect page with 'en' locale as fallback
    return NextResponse.redirect(new URL('/en/auth-redirect', request.url));
  } catch (error) {
    console.error('Exception during auth callback:', error);
    return NextResponse.redirect(new URL('/en/login?error=Server error', request.url));
  }
}
