// DO NOT EDIT THIS FILE
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
    Referer: ${request.headers.get('referer')}`,
  );

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
              // Enhanced cookie options for both development and production
              const finalOptions = {
                ...options,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' as const,
                domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined,
                maxAge: name.includes('token') ? 60 * 60 * 24 * 7 : undefined,
              };

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
 *
 * @param request The Next.js request object
 * @param clientData Optional pre-created Supabase client to reuse
 * @returns NextResponse with updated cookies
 */
export async function updateSession(
  request: NextRequest,
  clientData?: { supabase: any; response: NextResponse },
): Promise<NextResponse> {
  console.log(
    `[Middleware:updateSession] Processing ${request.method} request for ${request.nextUrl.pathname}`,
  );
  const startTime = Date.now();

  const { supabase, response } = clientData || createClient(request);

  let sessionData: any = null;
  let sessionError: any = null;
  let userData: any = { user: null };
  let userError: any = null;

  if (clientData) {
    // Use pre-validated session
    console.log('[Middleware:updateSession] Using pre-validated authentication from middleware');
    const result = await supabase.auth.getSession();
    sessionData = result.data;
    sessionError = result.error;
  } else {
    // Validate user directly
    const result = await supabase.auth.getUser();
    userData = result.data;
    userError = result.error;

    if (userError) {
      console.log('🔍 AUTH MIDDLEWARE ERROR:', userError.message);
      console.log('🔍 Request URL:', request.nextUrl.pathname);
    } else if (userData.user) {
      console.log('🔍 AUTH MIDDLEWARE: User authenticated', userData.user.id);
      console.log(`[Middleware:auth] User authenticated in ${Date.now() - startTime}ms`);
    }
  }

  const isDataFetchRequest =
    request.method === 'POST' && !request.nextUrl.pathname.startsWith('/api/');
  console.log(
    `[Middleware:check] isDataFetchRequest=${isDataFetchRequest}, Method=${request.method}, Path=${request.nextUrl.pathname}`,
  );

  const isAuthError =
    (sessionError || userError) &&
    (sessionError?.status === 401 ||
      userError?.status === 401 ||
      sessionError?.message?.includes('Invalid JWT') ||
      userError?.message?.includes('Invalid JWT'));

  if ((!sessionData?.session && !userData.user) || isAuthError) {
    if (isDataFetchRequest) {
      console.log('[Middleware:skip] Skipping redirect for data fetch request');
      return response;
    }

    console.log('[Middleware:redirect] No authenticated user found. Redirecting to login page.');
    if (sessionError || userError) {
      console.log(
        '[Middleware:redirect] Auth error details:',
        (sessionError || userError)?.message,
      );
    }

    const hasAuthCookies = request.cookies
      .getAll()
      .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'));
    if (hasAuthCookies) {
      console.log(
        '[Middleware:cookies] Auth cookies present but failed to authenticate - possible cookie issue',
      );
    }

    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
    const locale =
      pathParts.length > 0 && locales.includes(pathParts[0] as any) ? pathParts[0] : defaultLocale;
    const redirectUrl = new URL(`/${locale}/login`, request.url);
    console.log(`[Middleware:redirect] Redirecting to ${redirectUrl.toString()}`);

    const redirectResponse = NextResponse.redirect(redirectUrl, { status: 307 });
    return clearAuthCookies(redirectResponse);
  }

  console.log(`[Middleware:complete] Finished processing request in ${Date.now() - startTime}ms`);
  return response;
}
