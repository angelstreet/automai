// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

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
    '/login',
    '/signup',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/auth-redirect',
    '/test-auth',
    '/error',
    '/_next',
    '/favicon.ico',
  ];

  // Add locale-based paths to public paths
  locales.forEach((locale) => {
    publicPaths.push(`/${locale}`);
    publicPaths.push(`/${locale}/`);
    publicPaths.push(`/${locale}/login`);
    publicPaths.push(`/${locale}/signup`);
    publicPaths.push(`/${locale}/forgot-password`);
    publicPaths.push(`/${locale}/reset-password`);
    publicPaths.push(`/${locale}/auth-redirect`);
  });

  // Check if it's a public path
  const isPublicPath =
    publicPaths.some((path) => request.nextUrl.pathname === path) ||
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.includes('auth-redirect') ||
    (pathParts.length >= 2 &&
     locales.includes(pathParts[0] as any) &&
     ['login', 'signup', 'forgot-password', 'reset-password', 'auth-redirect'].includes(
       pathParts[1],
     ));

  if (isPublicPath) {
    // For public paths, just continue without auth check
    return NextResponse.next();
  }

  // 4. For all other paths, use Supabase's updateSession
  // This will handle session validation and token refresh
  const response = await updateSession(request);
  
  // 5. Apply internationalization middleware
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
