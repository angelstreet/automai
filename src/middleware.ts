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
    // Match all routes
    '/',
    '/(fr|en)/:path*',
  ],
};
