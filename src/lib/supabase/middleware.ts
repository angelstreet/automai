// DO NOT MODIFY THIS FILE
import { createServerClient, CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { locales, defaultLocale } from '@/config';

/**
 * Creates a Supabase client for middleware
 * - Handles cookie management for authentication in middleware
 * - Allows updating cookies in the response
 */
export const createClient = (request: NextRequest) => {
  // Log request details with enhanced debugging
  console.log(
    `[Middleware:createClient] 
    URL: ${request.nextUrl.pathname}${request.nextUrl.search}
    Method: ${request.method}
    Host: ${request.headers.get('host')}
    Origin: ${request.headers.get('origin')}
    Referer: ${request.headers.get('referer')}`,
  );
  
  // Check if this request is from Cloudworkstations
  const isCloudWorkstation = 
    request.headers.get('host')?.includes('cloudworkstations.dev') ||
    request.headers.get('referer')?.includes('cloudworkstations.dev') ||
    request.headers.get('origin')?.includes('cloudworkstations.dev');
    
  if (isCloudWorkstation) {
    console.log('[Middleware] Cloudworkstations environment detected');
  }

  // Create response to manipulate cookies
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Check for auth-related cookies specifically and log them
  const allCookies = request.cookies.getAll();
  const authCookies = allCookies.filter(
    (cookie) =>
      cookie.name.includes('supabase') ||
      cookie.name.includes('sb-') ||
      cookie.name.includes('_verifier') ||
      cookie.name.includes('refresh') ||
      cookie.name.includes('access'),
  );

  if (authCookies.length > 0) {
    console.log(`[Middleware:auth-cookies] Found ${authCookies.length} auth cookies:`);
    authCookies.forEach((cookie) => {
      // Only log the cookie name and a hint about its value (not the full value for security)
      console.log(
        `[Middleware:auth-cookie] ${cookie.name}: length=${cookie.value.length}, expires=${cookie.expires || 'session'}`,
      );
    });
  }

  // Enhanced cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          try {
            return request.cookies.getAll().map((cookie) => ({
              name: cookie.name,
              value: cookie.value,
            }));
          } catch (error) {
            console.error('[Middleware:cookies] Error getting cookies:', error);
            return [];
          }
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Enhanced cookie options based on environment
              const finalOptions = {
                ...options,
                path: '/',
                secure: isCloudWorkstation || process.env.NODE_ENV === 'production',
                sameSite: isCloudWorkstation ? 'none' as const : 'lax' as const,
                // Don't set domain - let the browser determine it based on the current host
                domain: undefined,
                maxAge: name.includes('token') ? 60 * 60 * 24 * 7 : undefined,
              };
              
              console.log(`[Middleware:cookies] Setting cookie ${name} with options:`, {
                secure: finalOptions.secure,
                sameSite: finalOptions.sameSite,
                domain: finalOptions.domain,
                path: finalOptions.path,
                maxAge: finalOptions.maxAge
              });

              request.cookies.set({
                name,
                value,
                ...finalOptions,
              });

              response.cookies.set({
                name,
                value,
                ...finalOptions,
              });
            });
          } catch (error) {
            console.error('[Middleware:cookies] Error setting cookies:', error);
          }
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
  console.log('[Middleware:clearAuthCookies] Clearing auth cookies');
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
  console.log(
    `[Middleware:updateSession] Processing ${request.method} request for ${request.nextUrl.pathname}`,
  );
  const startTime = Date.now();

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
    console.log(`[Middleware:auth] User authenticated in ${Date.now() - startTime}ms`);
  }

  // Check if this is a data fetching request (POST to a page route)
  // These should not be redirected to prevent redirect loops
  const isDataFetchRequest =
    request.method === 'POST' && !request.nextUrl.pathname.startsWith('/api/');

  console.log(
    `[Middleware:check] isDataFetchRequest=${isDataFetchRequest}, Method=${request.method}, Path=${request.nextUrl.pathname}`,
  );

  // Only redirect for specific auth errors, not network errors
  const isAuthError = error && (error.status === 401 || error.message?.includes('Invalid JWT'));
  if ((!data.user || isAuthError) && !isDataFetchRequest) {
    console.log('[Middleware:redirect] No authenticated user found. Redirecting to login page.');
    // Reduce logging to essential information only
    if (error) {
      console.log('[Middleware:redirect] Auth error details:', error?.message);
    }

    // Check if there are some auth cookies present even though we couldn't get a user
    // This might indicate a cookie-related issue rather than truly unauthenticated
    const hasAuthCookies = request.cookies
      .getAll()
      .some((c) => c.name.startsWith('sb-access-token') || c.name.startsWith('sb-refresh-token'));

    if (hasAuthCookies) {
      console.log(
        '[Middleware:cookies] Auth cookies present but failed to authenticate - possible cookie issue',
      );
      // For debugging: if auth cookies exist but auth failed, we'll still let the request through
      // This helps diagnose issues where cookies exist but aren't being properly parsed
      // In production, you'd want to remove this and always redirect to login
      console.log(
        '[Middleware:cookies] Allowing request to proceed despite auth failure due to cookie presence',
      );
      return response;
    }

    // Extract locale from URL
    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
    const locale =
      pathParts.length > 0 && locales.includes(pathParts[0] as any) ? pathParts[0] : defaultLocale;

    // Create a new URL for the redirect
    const redirectUrl = new URL(`/${locale}/login`, request.url);
    console.log(`[Middleware:redirect] Redirecting to ${redirectUrl.toString()}`);

    // Create a redirect response
    const redirectResponse = NextResponse.redirect(redirectUrl, { status: 307 });

    // Clear auth cookies in the redirect response
    return clearAuthCookies(redirectResponse);
  }

  // Return the response with updated cookies for authenticated users
  console.log(`[Middleware:complete] Finished processing request in ${Date.now() - startTime}ms`);
  return response;
}
