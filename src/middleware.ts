// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

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
  // Skip internationalization middleware for WebSocket connections
  if (request.headers.get('upgrade')?.includes('websocket')) {
    return NextResponse.next();
  }

  // All API paths should bypass internationalization and be handled by the API route
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Apply internationalization middleware for regular requests
  const middleware = await getIntlMiddleware();
  return middleware(request);
}

export const config = {
  matcher: [
    // Match all routes except static assets, public files, and API routes
    '/((?!_next/static|_next/image|avatars|favicon.ico|api/).*)',
    // Match all locale routes
    '/(fr|en)/:path*',
    // Match root path
    '/'
  ],
};
