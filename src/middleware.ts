// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { getToken } from 'next-auth/jwt';

import { locales, defaultLocale } from './config';

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export default async function middleware(request: NextRequest) {
  // Skip internationalization middleware for WebSocket connections
  if (request.headers.get('upgrade')?.includes('websocket')) {
    return NextResponse.next();
  }

  // Auth paths should bypass internationalization and be handled by the API route
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Apply internationalization middleware first
  const response = intlMiddleware(request);
  
  // Get the pathname from the response URL
  const pathname = response.headers.get('x-middleware-rewrite') || 
                  request.nextUrl.pathname;
  
  // Skip auth check for public routes
  const isPublicRoute = 
    pathname.includes('/login') ||
    pathname.includes('/signup') ||
    pathname.includes('/(auth)/auth-redirect') ||
    pathname.includes('/error');
  
  if (isPublicRoute) {
    return response;
  }
  
  // Check authentication
  const token = await getToken({ req: request });
  
  // If no token and not a public route, redirect to login
  if (!token && !isPublicRoute) {
    // Extract locale from pathname
    const locale = pathname.split('/')[1] || defaultLocale;
    const url = new URL(`/${locale}/login`, request.url);
    return NextResponse.redirect(url);
  }
  
  return response;
}

export const config = {
  matcher: [
    // Match all routes except static assets and public files
    '/((?!_next/static|_next/image|avatars|favicon.ico).*)',
    // Match all locale routes
    '/(fr|en)/:path*',
    // Match root path
    '/'
  ],
};
