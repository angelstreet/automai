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
  console.log('Middleware processing:', request.nextUrl.pathname);
  
  // 1. WebSocket handling
  if (request.headers.get('upgrade')?.includes('websocket')) {
    console.log('WebSocket request detected, bypassing middleware');
    return NextResponse.next();
  }

  // 2. Define public paths that bypass auth checks
  const publicPaths = [
    '/login', 
    '/register',
    '/signup',
    '/auth-redirect',
    '/error',
    '/api/auth', 
    '/_next', 
    '/favicon.ico', 
    '/api/hosts/byName',
    '/api/terminals/init',
    '/api/terminals/ws'
  ];
  
  // Extract path parts for better matching
  const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
  
  // Check if it's a public path more precisely
  const isPublicPath = 
    // Check exact matches in publicPaths
    publicPaths.some(path => request.nextUrl.pathname.includes(path)) || 
    // Root path
    request.nextUrl.pathname === '/' ||
    // Locale root paths like /en or /fr
    (pathParts.length === 1 && locales.includes(pathParts[0])) ||
    // Public API routes
    (request.nextUrl.pathname.startsWith('/api/auth/'));
  
  if (isPublicPath) {
    console.log('Public path detected, bypassing auth:', request.nextUrl.pathname);
    return NextResponse.next();
  }

  // 3. Auth check for protected routes
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  
  // More precise protected route detection
  const protectedPaths = ['/dashboard', '/admin', '/repositories', '/terminals', '/settings'];
  
  // Check if any part of the path matches a protected path
  const isProtectedRoute = isApiRoute || 
    protectedPaths.some(protectedPath => {
      // For each path part, check if it matches a protected path
      return pathParts.some(part => part === protectedPath.replace('/', ''));
    });
  
  console.log('Route protection check:', { 
    path: request.nextUrl.pathname, 
    isProtectedRoute, 
    pathParts 
  });
  
  if (isProtectedRoute) {
    // Skip auth check for specific API endpoints
    if (request.nextUrl.pathname.startsWith('/api/hosts/byName')) {
      console.log('Bypassing auth for hosts API');
      return NextResponse.next();
    }
    
    const token = await getToken({ req: request });
    console.log('Auth token check:', { 
      path: request.nextUrl.pathname, 
      hasToken: !!token 
    });
    
    if (!token) {
      console.log('No auth token found for protected route:', request.nextUrl.pathname);
      
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Extract locale from URL for redirect
      const locale = pathParts[0];
      const validLocale = locales.includes(locale) ? locale : defaultLocale;
      
      // Redirect to login with the current URL as the callbackUrl
      const loginUrl = new URL(`/${validLocale}/login`, request.url);
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      console.log('Redirecting to:', loginUrl.toString());
      return NextResponse.redirect(loginUrl);
    }
    
    // Skip i18n middleware for API routes
    if (isApiRoute) {
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
