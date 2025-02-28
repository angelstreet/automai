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

  // Apply internationalization middleware for regular requests
  const middleware = await getIntlMiddleware();
  return middleware(request);
}

export const config = {
  matcher: [
    // Match all routes except API routes, static assets, and public files
    '/((?!api|_next/static|_next/image|avatars|favicon.ico).*)',
    '/(fr|en)/:path*',
  ],
};
