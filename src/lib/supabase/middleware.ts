// DO NOT MODIFY THIS FILE
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { locales, defaultLocale } from '@/config';

/**
 * Creates a Supabase client for middleware
 * - Handles cookie management for authentication in middleware
 * - Allows updating cookies in the response
 */
export const createClient = (request: NextRequest) => {
  // Log request details
  console.log(
    `[SUPABASE MW:createClient] URL: ${request.nextUrl.pathname}${request.nextUrl.search}, Method: ${request.method}`,
  );

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
          const cookies = request.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
          console.log(`[SUPABASE MW:cookies] Found ${cookies.length} cookies`);
          return cookies;
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          // Set cookies both on the request (for Supabase) and response (for browser)
          console.log(`[SUPABASE MW:cookies] Setting ${cookiesToSet.length} cookies`);
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
    },
  );

  return { supabase, response };
};

/**
 * Clears all Supabase auth-related cookies
 */
function clearAuthCookies(response: NextResponse): NextResponse {
  console.log(`--------------------------------`);
  console.log('[SUPABASE MW:clearAuthCookies] Clearing auth cookies');
  // Known Supabase auth cookie names
  const authCookies = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token'];

  // Clear each cookie
  authCookies.forEach((name) => {
    response.cookies.set({
      name,
      value: '',
      expires: new Date(0), // Immediately expire
      path: '/',
    });
  });
  console.log(`--------------------------------`);
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
  console.log(`--------------------------------`);
  console.log(`[SUPABASE MW:updateSession] Processing ${request.method} request for ${request.nextUrl.pathname}`);
  const startTime = Date.now();

  // Create the Supabase client
  const { supabase, response } = createClient(request);

  // IMPORTANT: DO NOT REMOVE auth.getUser() call or add code between
  // createClient and getUser() - this ensures proper token validation
  const { data, error } = await supabase.auth.getUser();

  // Reduced logging for better performance - only log errors
  if (error) {
    console.log('🔍 SUPABASE MW ERROR:', error.message);
    console.log('🔍 Request URL:', request.nextUrl.pathname);
  } else if (data.user) {
    // Just log minimal user info
    console.log(
      '[SUPABASE MW:auth] User authenticated in ${Date.now() - startTime}ms', 
      data.user.id,
    );
  }

  // Check if this is a data fetching request (POST to a page route)
  // These should not be redirected to prevent redirect loops
  const isDataFetchRequest =
    request.method === 'POST' && !request.nextUrl.pathname.startsWith('/api/');

  console.log(`[SUPABASE MW:check] isDataFetchRequest=${isDataFetchRequest}, Method=${request.method}, Path=${request.nextUrl.pathname}`);

  // If no user is found or there's an error, redirect to login ONLY for GET requests
  // Allow data fetching POST requests to proceed even without authentication
  if ((error || !data.user) && !isDataFetchRequest) {
    console.log('[SUPABASE MW:redirect] No authenticated user found. Redirecting to login page.');
    // Reduce logging to essential information only
    if (error) {
      console.log('[SUPABASE MW:redirect] Auth error details:', error?.message);
    }

    // Check if there are some auth cookies present even though we couldn't get a user
    // This might indicate a cookie-related issue rather than truly unauthenticated
    const hasAuthCookies = request.cookies
      .getAll()
      .some((c) => c.name.startsWith('sb-access-token') || c.name.startsWith('sb-refresh-token'));

    if (hasAuthCookies) {
      console.log(
        '[SUPABASE MW :cookies] Auth cookies present but failed to authenticate - possible cookie issue',
      );
      return response;
    }

    // Extract locale from URL
    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
    const locale =
      pathParts.length > 0 && locales.includes(pathParts[0] as any) ? pathParts[0] : defaultLocale;

    // Create a new URL for the redirect
    const redirectUrl = new URL(`/${locale}/login`, request.url);
    console.log(`[SUPABASE MW:redirect] Redirecting to ${redirectUrl.toString()}`);

    // Create a redirect response
    const redirectResponse = NextResponse.redirect(redirectUrl, { status: 307 });

    // Clear auth cookies in the redirect response
    return clearAuthCookies(redirectResponse);
  }

  // Return the response with updated cookies for authenticated users
  console.log(`[SUPABASE MW:complete] Finished processing request in ${Date.now() - startTime}ms`);
  console.log(`--------------------------------`);
  return response;
}
