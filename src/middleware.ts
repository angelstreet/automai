// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale, pathnames } from './config';
import { handler } from '@/auth';

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

  // Auth paths should bypass internationalization
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return handler(request as any);
  }

  // Apply internationalization middleware for regular requests
  const middleware = await getIntlMiddleware();
  return middleware(request);
}

export const config = {
  matcher: [
    // Match all routes except static assets and public files
    '/((?!_next/static|_next/image|avatars|favicon.ico).*)',
    '/(fr|en)/:path*',
    '/api/auth/:path*',
  ],
};
