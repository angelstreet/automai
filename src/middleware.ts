// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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
  // 1. WebSocket handling
  if (request.headers.get('upgrade')?.includes('websocket')) {
    return NextResponse.next();
  }

  // 2. Public routes bypass
  const publicPaths = ['/login', '/register', '/api/auth', '/_next', '/favicon.ico', '/api/hosts/byName'];
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 3. Auth check for protected routes
  if (request.nextUrl.pathname.startsWith('/api/') || 
      request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/admin')) {
    
    // Skip auth check for hosts API for debugging
    if (request.nextUrl.pathname.startsWith('/api/hosts/byName')) {
      console.log('Bypassing auth for hosts API');
      return NextResponse.next();
    }
    
    const token = await getToken({ req: request });
    if (!token) {
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Skip i18n middleware for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.next();
    }
  }

  // 4. i18n handling
  const intl = await getIntlMiddleware();
  return intl(request);
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
