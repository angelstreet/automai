// DO NOT MODIFY THIS FILE
import { createServerClient, CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

import { locales, defaultLocale } from '@/config';

// Cache to store validated sessions (5-minute TTL)
const sessionCache = new Map<string, { userId: string; expiresAt: number }>();

// Clean expired cache entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sessionCache.entries()) {
      if (value.expiresAt < now) {
        sessionCache.delete(key);
      }
    }
  }, 60 * 1000);
}

// Helper function to decode JWT base64url format
function base64urlDecode(str: string): string {
  // Convert base64url to base64 by replacing URL-safe chars and adding padding
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  // Decode to string
  try {
    return Buffer.from(base64, 'base64').toString();
  } catch (e) {
    throw new Error('Invalid base64 string');
  }
}

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
        `[Middleware:auth-cookie] ${cookie.name}: length=${cookie.value.length}, expires=session`,
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
                sameSite: isCloudWorkstation ? ('none' as const) : ('lax' as const),
                // Don't set domain - let the browser determine it based on the current host
                domain: undefined,
                maxAge: name.includes('token') ? 60 * 60 * 24 * 7 : undefined,
              };

              console.log(`[Middleware:cookies] Setting cookie ${name} with options:`, {
                secure: finalOptions.secure,
                sameSite: finalOptions.sameSite,
                domain: finalOptions.domain,
                path: finalOptions.path,
                maxAge: finalOptions.maxAge,
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
 * Extract and validate JWT token from auth cookie
 * Returns userId if valid, null if invalid
 */
async function validateAuthToken(request: NextRequest): Promise<string | null> {
  try {
    // Get auth cookie (JWT token)
    const authCookie = request.cookies.get('sb-wexkgcszrwxqsthahfyq-auth-token.0');
    
    if (!authCookie?.value) {
      return null;
    }
    
    // Check cache first
    const cacheKey = authCookie.value.slice(0, 64); // Use part of token as cache key
    const cachedSession = sessionCache.get(cacheKey);
    
    if (cachedSession && cachedSession.expiresAt > Date.now()) {
      console.log('[Middleware:auth] Using cached session validation');
      return cachedSession.userId;
    }
    
    // Parse the JWT to extract payload
    try {
      // Handle base64 format - the cookie appears to start with "base64-eyJ"
      let tokenValue = authCookie.value;
      
      // Check if it's in the base64 format (starts with "base64-")
      if (tokenValue.startsWith('base64-')) {
        // Extract just the base64 part (remove the "base64-" prefix)
        tokenValue = tokenValue.substring(7);
      }
      
      // Try to parse as JSON first (Supabase may store structured data)
      try {
        const jsonData = JSON.parse(tokenValue);
        // If parsed successfully as JSON and contains access_token, use that
        if (jsonData && jsonData.access_token) {
          tokenValue = jsonData.access_token;
        }
      } catch (e) {
        // Not JSON, continue with the raw value (might be direct JWT)
      }
      
      // Decode JWT parts - JWT structure is header.payload.signature
      const parts = tokenValue.split('.');
      
      // Need at least 2 parts for a proper JWT (header and payload)
      if (parts.length < 2) {
        return null;
      }
      
      // The payload is the second part (index 1)
      let payload;
      try {
        // Base64url decode and parse the payload
        const base64Payload = parts[1]; 
        const decodedPayload = base64urlDecode(base64Payload);
        payload = JSON.parse(decodedPayload);
      } catch (e) {
        console.error('[Middleware:auth] Error decoding JWT payload:', e);
        return null;
      }
      
      // Check if token is expired
      if (!payload.exp || payload.exp * 1000 < Date.now()) {
        return null;
      }
      
      // Extract user ID (sub claim in JWT)
      const userId = payload.sub;
      
      if (!userId) {
        return null;
      }
      
      // Cache the validation result (5-minute TTL)
      sessionCache.set(cacheKey, {
        userId,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      
      return userId;
    } catch (err) {
      console.error('[Middleware:auth] Error parsing JWT token:', err);
      return null;
    }
  } catch (error) {
    console.error('[Middleware:auth] Token validation error:', error);
    return null;
  }
}

/**
 * Updates the Supabase Auth session in middleware
 * - Efficiently validates JWT token without Supabase API calls when possible
 * - Falls back to Supabase auth API only when needed
 * - Returns a NextResponse with updated cookies
 * - Redirects to login if no authenticated user is found
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  console.log(
    `[Middleware:updateSession] Processing ${request.method} request for ${request.nextUrl.pathname}`,
  );
  const startTime = Date.now();

  // First, try to validate the token locally without API calls
  const userId = await validateAuthToken(request);
  
  // Create the default response
  const { supabase, response } = createClient(request);
  
  if (userId) {
    // Token is valid, skip Supabase API call
    console.log('🔍 AUTH MIDDLEWARE: User authenticated via local validation', userId);
    console.log(`[Middleware:auth] User authenticated in ${Date.now() - startTime}ms`);
    
    // Check if this is a data fetching request (POST to a page route)
    const isDataFetchRequest =
      request.method === 'POST' && !request.nextUrl.pathname.startsWith('/api/');
    
    console.log(
      `[Middleware:check] isDataFetchRequest=${isDataFetchRequest}, Method=${request.method}, Path=${request.nextUrl.pathname}`,
    );
    
    console.log(`[Middleware:complete] Finished processing request in ${Date.now() - startTime}ms`);
    return response;
  }
  
  // Token validation failed or no token found, fallback to Supabase API
  console.log('[Middleware:auth] Local validation failed, falling back to Supabase API');
  
  // Standard Supabase auth check
  const { data, error } = await supabase.auth.getUser();

  // Reduced logging for better performance - only log errors
  if (error) {
    console.log('🔍 AUTH MIDDLEWARE ERROR:', error.message);
    console.log('🔍 Request URL:', request.nextUrl.pathname);
  } else if (data.user) {
    // Just log minimal user info
    console.log('🔍 AUTH MIDDLEWARE: User authenticated via Supabase API', data.user.id);
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
