// src/middleware-custom.ts
import { NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

import { locales, defaultLocale } from './config';

// Lazy-loaded intl middleware
let intlMiddleware: any = null;
async function getIntlMiddleware() {
  if (!intlMiddleware) {
    const { default: createIntlMiddleware } = await import('next-intl/middleware');
    intlMiddleware = createIntlMiddleware({
      locales,
      defaultLocale,
      localePrefix: 'always',
    });
  }
  return intlMiddleware;
}

// Public paths (no auth required)
const PUBLIC_PATHS = ['/', '/features', '/pricing', '/docs', '/login', '/signup'];

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Handle HTML content type bypass (from mw.ts)
  const contentType = request.headers.get('content-type') || '';
  const acceptHeader = request.headers.get('accept') || '';
  if (contentType.includes('text/html') || acceptHeader.includes('text/html')) {
    return NextResponse.next();
  }

  // 2. Public paths: apply locale but RETURN EARLY
  if (PUBLIC_PATHS.some((p) => path === p || path === `/${defaultLocale}${p}`)) {
    // Special handling for root path to prevent double locale
    if (path === '/') {
      return NextResponse.redirect(new URL(`/${defaultLocale}`, request.url));
    }
    return NextResponse.next();
  }

  // 3. API routes: enforce auth
  if (path.startsWith('/api/')) {
    // API auth logic...
    return NextResponse.next();
  }

  // 4. Protected routes: enforce locale and auth
  const hasLocale = locales.some((locale) => path.startsWith(`/${locale}/`));
  if (!hasLocale) {
    return NextResponse.redirect(new URL(`/${defaultLocale}${path}`, request.url));
  }

  // 5. Update session and apply intl
  const response = await updateSession(request);
  const intl = await getIntlMiddleware();
  return intl(response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|avatars|favicon.ico).*)',
    '/(fr|en)/:path*',
    '/api/:path*',
    '/',
  ],
};
