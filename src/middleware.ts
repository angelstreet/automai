// src/middleware.ts
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, pathnames } from './config';
import { NextRequest, NextResponse } from 'next/server';

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  pathnames,
  localePrefix: 'always',
});

export default function middleware(request: NextRequest) {
  // Skip internationalization middleware for WebSocket connections
  if (request.headers.get('upgrade')?.includes('websocket')) {
    return NextResponse.next();
  }

  // Apply internationalization middleware for regular requests
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all routes except API routes, static assets, and public files
    '/((?!api|_next/static|_next/image|avatars|favicon.ico).*)',
    '/(fr|en)/:path*',
  ],
};
