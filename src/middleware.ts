// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateSession, createClient } from '@/lib/supabase/middleware';

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
  // 1. First check if it's a public path that should bypass auth
  const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
  
  // Check if it's a login-related path or auth callback
  const isLoginPath = request.nextUrl.pathname.includes('/login') ||
                     request.nextUrl.pathname.includes('/signup') ||
                     request.nextUrl.pathname.includes('/forgot-password') ||
                     request.nextUrl.pathname.includes('/reset-password');

  // Specifically check for auth-redirect with code param
  const isAuthCallback = request.nextUrl.pathname.includes('/auth-redirect') && 
                        request.nextUrl.searchParams.has('code');

  // Skip auth check for login paths and initial auth callback
  if (isLoginPath || isAuthCallback) {
    return NextResponse.next();
  }

  // 2. Check if it's a protected route that needs auth
  const isServerAction = request.headers.get('accept')?.includes('text/x-component') ||
                        request.headers.has('next-action');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isProtectedRoute = isServerAction || isApiRoute || 
                          (pathParts.length >= 2 && pathParts[1] === 'trial');

  if (isProtectedRoute) {
    const { supabase, response } = createClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
      // For API routes return 401
      if (isApiRoute) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // For other routes, redirect to login
      const locale = pathParts.length > 0 && locales.includes(pathParts[0] as any)
        ? pathParts[0]
        : defaultLocale;
        
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }

    // If authenticated, continue
    return response;
  }

  // 3. Only now check for HTML content type bypass
  const contentType = request.headers.get('content-type') || '';
  const acceptHeader = request.headers.get('accept') || '';
  const userAgent = request.headers.get('user-agent') || '';
  
  if (contentType.includes('text/html') || 
      acceptHeader.includes('text/html') || 
      contentType.includes('application/xhtml+xml')) {
    console.log('[Middleware] Detected HTML-related content type, bypassing middleware processing');
    return NextResponse.next();
  }

  // 4. For all other paths, use Supabase's updateSession
  try {
    const response = await updateSession(request);

    if (response.headers.has('location')) {
      console.log('Redirecting to:', response.headers.get('location'));
      return response;
    }

    const intl = await getIntlMiddleware();
    return intl(response);
  } catch (error) {
    console.error('[Middleware] Error in updateSession:', error);
    return NextResponse.next();
  }
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
