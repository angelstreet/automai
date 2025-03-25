// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

import { updateSession, createClient } from '@/lib/supabase/middleware';

import { locales, defaultLocale, pathnames } from './config';

// Lazy load the internationalization middleware
let intlMiddleware: any = null;

async function getIntlMiddleware() {
  if (!intlMiddleware) {
    const { default: createIntlMiddleware } = await import('next-intl/middleware');
    intlMiddleware = createIntlMiddleware({
      locales,
      defaultLocale,
      pathnames,
      localePrefix: 'always',
    });
  }
  return intlMiddleware;
}

export default async function middleware(request: NextRequest) {
  // 1. First, normalize URL case (lowercase)
  const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
  const originalPath = request.nextUrl.pathname;
  const lowercasePath = originalPath.toLowerCase();

  // Skip case normalization for locale root paths to prevent redirect loops
  const isLocaleRootPath = pathParts.length === 1 && locales.includes(pathParts[0] as any);
  if (!isLocaleRootPath && lowercasePath !== originalPath) {
    console.log('Normalizing URL case:', originalPath, 'to', lowercasePath);
    return NextResponse.redirect(new URL(lowercasePath, request.url));
  }

  // 2. Skip auth for WebSockets, API routes, and RSC requests
  if (
    request.headers.get('upgrade')?.includes('websocket') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.search.includes('_rsc=')
  ) {
    return NextResponse.next();
  }

  // 3. Define public paths that bypass auth checks
  const publicPaths = [
    '/',
    '/signup',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/auth-redirect',
    '/test-auth',
    '/error',
    '/_next',
    '/favicon.ico',
    '/features',
    '/pricing',
    '/docs',
  ];

  // Define auth-only paths that should redirect to dashboard if already authenticated
  const authOnlyPaths = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/auth-redirect',
  ];

  // Add locale-based paths to public and auth-only paths
  locales.forEach((locale) => {
    // Public paths with locale (pages anyone can access)
    publicPaths.push(`/${locale}`);
    publicPaths.push(`/${locale}/`);
    publicPaths.push(`/${locale}/features`);
    publicPaths.push(`/${locale}/pricing`);
    publicPaths.push(`/${locale}/docs`);

    // Auth-only paths with locale (pages that should redirect to dashboard if authenticated)
    authOnlyPaths.push(`/${locale}/login`);
    authOnlyPaths.push(`/${locale}/signup`);
    authOnlyPaths.push(`/${locale}/forgot-password`);
    authOnlyPaths.push(`/${locale}/reset-password`);
    authOnlyPaths.push(`/${locale}/auth-redirect`);
  });

  // Check if it's a public path
  const isPublicPath =
    publicPaths.some((path) => request.nextUrl.pathname === path) ||
    request.nextUrl.pathname === '/';

  // Check if it's an auth-only path (like login)
  const isAuthOnlyPath =
    authOnlyPaths.some((path) => request.nextUrl.pathname === path) ||
    (pathParts.length >= 2 &&
      locales.includes(pathParts[0] as any) &&
      ['login', 'signup', 'forgot-password', 'reset-password', 'auth-redirect'].includes(
        pathParts[1],
      ));

  // For auth-only paths like login, we need to check if the user is already authenticated
  // If they are, redirect them to dashboard
  if (isAuthOnlyPath) {
    // Import from supabase/middleware.ts
    const { supabase, response } = createClient(request);
    try {
      const { data } = await supabase.auth.getUser();

      if (data?.user) {
        // User is already logged in, redirect to dashboard
        const locale =
          pathParts.length > 0 && locales.includes(pathParts[0] as any)
            ? pathParts[0]
            : defaultLocale;

        // Get tenant from user metadata or default to 'trial'
        const tenantName = data.user.user_metadata?.tenant_name || 'trial';

        // Redirect to tenant-specific dashboard
        return NextResponse.redirect(new URL(`/${locale}/${tenantName}/dashboard`, request.url));
      }

      // User not logged in, continue to login page
      return NextResponse.next();
    } catch (error) {
      console.error('Error checking authentication for auth-only path:', error);
      return NextResponse.next();
    }
  }

  // For regular public paths, just continue without auth check
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 4. For all other paths, use Supabase's updateSession
  // This will handle session validation and token refresh
  const response = await updateSession(request);

  // If the response is a redirect (unauthenticated), return it directly
  if (response.headers.has('location')) {
    console.log('Redirecting to:', response.headers.get('location'));
    return response;
  }

  // Access user session info from cookies if needed for debugging (non-invasive)
  // We don't actually extract the data here to avoid breaking anything
  console.log('Middleware: Processing authenticated request');

  // 5. Apply internationalization middleware for non-redirect responses
  const intl = await getIntlMiddleware();
  return intl(response);
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|avatars|favicon.ico).*)',
    // Match all locale routes
    '/(fr|en)/:path*',
    // Match API routes
    '/api/:path*',
    // Match root path
    '/',
  ],
};
