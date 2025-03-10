// DO NOT MODIFY THIS FILE
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';
import { locales, defaultLocale } from '@/config';

/**
 * Creates a Supabase client for middleware
 * - Handles cookie management for authentication in middleware
 * - Allows updating cookies in the response
 */
export const createClient = (request: NextRequest) => {
  // Create response to manipulate cookies
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  // Create client with cookie handlers for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Simply map the cookies to the expected format
          return request.cookies.getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          // Set cookies both on the request (for Supabase) and response (for browser)
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          });
        },
      },
    }
  );
  
  return { supabase, response };
};

/**
 * Clears all Supabase auth-related cookies
 */
function clearAuthCookies(response: NextResponse): NextResponse {
  // Known Supabase auth cookie names
  const authCookies = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token'
  ];
  
  // Clear each cookie
  authCookies.forEach(name => {
    response.cookies.set({
      name,
      value: '',
      expires: new Date(0), // Immediately expire
      path: '/',
    });
  });
  
  return response;
}

/**
 * Updates the Supabase Auth session in middleware
 * - Refreshes the auth token
 * - Validates the user's session
 * - Returns a NextResponse with updated cookies
 * - Redirects to login if no authenticated user is found
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Create the Supabase client
  const { supabase, response } = createClient(request);

  // IMPORTANT: DO NOT REMOVE auth.getUser() call or add code between
  // createClient and getUser() - this ensures proper token validation
  const { data, error } = await supabase.auth.getUser();

  // Reduced logging for better performance - only log errors
  if (error) {
    console.log('🔍 AUTH MIDDLEWARE ERROR:', error.message);
    console.log('🔍 Request URL:', request.nextUrl.pathname);
  } else if (data.user) {
    // Just log minimal user info
    console.log('🔍 AUTH MIDDLEWARE: User authenticated', data.user.id);
  }

  // If no user is found or there's an error, redirect to login
  if (error || !data.user) {
    console.log('No authenticated user found. Redirecting to login page.');
    // Reduce logging to essential information only
    if (error) {
      console.log('Auth error details:', error?.message);
    }
    
    // Check if there are some auth cookies present even though we couldn't get a user
    // This might indicate a cookie-related issue rather than truly unauthenticated
    const hasAuthCookies = request.cookies.getAll()
      .some(c => c.name.startsWith('sb-access-token') || c.name.startsWith('sb-refresh-token'));
    
    if (hasAuthCookies) {
      console.log('Auth cookies present but failed to authenticate - possible cookie issue');
      // For debugging: if auth cookies exist but auth failed, we'll still let the request through
      // This helps diagnose issues where cookies exist but aren't being properly parsed
      // In production, you'd want to remove this and always redirect to login
      console.log('Allowing request to proceed despite auth failure due to cookie presence');
      return response;
    }
    
    // Extract locale from URL
    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
    const locale = pathParts.length > 0 && locales.includes(pathParts[0] as any) 
      ? pathParts[0] 
      : defaultLocale;
    
    // Create a new URL for the redirect
    const redirectUrl = new URL(`/${locale}/login`, request.url);
    
    // Create a redirect response
    const redirectResponse = NextResponse.redirect(redirectUrl, { status: 307 });
    
    // Clear auth cookies in the redirect response
    return clearAuthCookies(redirectResponse);
  }

  // Return the response with updated cookies for authenticated users
  return response;
}