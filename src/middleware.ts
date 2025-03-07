// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

// Helper function to create login redirect response
function createLoginRedirect(request: NextRequest, pathParts: string[]) {
  // Extract locale from URL for redirect
  const locale = pathParts[0]?.toLowerCase() || defaultLocale;
  // Fix type error by asserting locale is a valid locale type
  const validLocale = locales.includes(locale as any)
    ? (locale as (typeof locales)[number])
    : defaultLocale;

  // Check if we should prevent redirect loops
  const hasDebugCookie = request.cookies.get('debug-bypass');
  const redirectParam = request.nextUrl.searchParams.get('redirect');

  // If we have a debug-bypass cookie or redirect param, skip the redirect
  if (hasDebugCookie?.value === 'true' || redirectParam === 'true') {
    console.log('Debug bypass detected, skipping login redirect');
    return NextResponse.next();
  }

  // Redirect to login with the current URL as the callbackUrl
  const loginUrl = new URL(`/${validLocale}/login`, request.url);

  // Always use lowercase for URLs
  const normalizedPathname = request.nextUrl.pathname.toLowerCase();
  loginUrl.searchParams.set('callbackUrl', normalizedPathname);

  console.log('Redirecting to:', loginUrl.toString());

  // Create the redirect response without deleting any session cookies
  // We should only delete session cookies during explicit logout
  const response = NextResponse.redirect(loginUrl);

  return response;
}

export default async function middleware(request: NextRequest) {
  console.log('Middleware processing:', request.nextUrl.pathname);

  // DEBUG: Log cookies for debugging
  console.log(
    'Cookies present:',
    request.cookies.getAll().map((c) => `${c.name}: ${c.value.substring(0, 10)}...`),
  );

  // Force lowercase for all parts of the URL to avoid case sensitivity issues
  const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
  const originalPath = request.nextUrl.pathname;
  let lowercasePath = originalPath.toLowerCase();

  // Handle locale paths with and without trailing slashes
  // Prevent unnecessary redirects between /en and /en/
  const isLocaleRootPath = pathParts.length === 1 && locales.includes(pathParts[0] as any);
  
  // Skip case normalization for locale root paths to prevent redirect loops
  if (!isLocaleRootPath && lowercasePath !== originalPath) {
    // Special handling for tenant paths (locale/tenant/*)
    if (pathParts.length >= 2) {
      console.log('Normalizing URL case:', originalPath, 'to', lowercasePath);
      return NextResponse.redirect(new URL(lowercasePath, request.url));
    }
  }

  // Check if this is a callback from login
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
  if (callbackUrl) {
    // Normalize the callback URL to lowercase
    const normalizedCallback = callbackUrl.toLowerCase();
    if (normalizedCallback !== callbackUrl) {
      // If the callback URL has uppercase letters, normalize it
      const newUrl = new URL(request.nextUrl.href);
      newUrl.searchParams.set('callbackUrl', normalizedCallback);
      console.log('Normalizing callback URL:', callbackUrl, 'to', normalizedCallback);
      return NextResponse.redirect(newUrl);
    }
  }

  // 1. WebSocket handling
  if (request.headers.get('upgrade')?.includes('websocket')) {
    console.log('WebSocket request detected, bypassing middleware');
    return NextResponse.next();
  }

  // Explicitly bypass authentication redirects for API routes
  // Explicitly bypass authentication redirects for API routes and RSC requests
  if (request.nextUrl.pathname.startsWith('/api/') || request.nextUrl.search.includes('_rsc=')) {
    console.log('API route or RSC request detected, bypassing authentication redirects:', {
      path: request.nextUrl.pathname,
      search: request.nextUrl.search,
      isRsc: request.nextUrl.search.includes('_rsc='),
    });

    const response = await NextResponse.next();
    if (response.headers.get('content-type')?.includes('text/html')) {
      return NextResponse.json({ error: 'API route returned HTML' }, { status: 500 });
    }
    return response;
  }

  // 2. Define public paths that bypass auth checks
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/auth-redirect', // Root auth redirect path
    '/en/auth-redirect', // Localized auth redirect paths
    '/fr/auth-redirect',
    '/test-auth', // Test auth page for debugging
    '/error',
    '/_next',
    '/favicon.ico',
    '/api/hosts/byName',
    '/api/terminals/init',
    '/api/terminals/ws',
  ];

  // Add locale-based home paths and auth pages to public paths
  locales.forEach((locale) => {
    // Root locale paths
    publicPaths.push(`/${locale}`);
    publicPaths.push(`/${locale}/`);

    // Auth-related paths for each locale
    publicPaths.push(`/${locale}/login`);
    publicPaths.push(`/${locale}/signup`);
    publicPaths.push(`/${locale}/forgot-password`);
    publicPaths.push(`/${locale}/reset-password`);
    publicPaths.push(`/${locale}/auth-redirect`);
  });

  // VERY IMPORTANT: Explicitly ensure that certain paths are considered public
  const isRootLocalePath = pathParts.length === 1 && locales.includes(pathParts[0] as any);
  const isExplicitLocalePath = locales.some(
    (locale) =>
      request.nextUrl.pathname === `/${locale}` || request.nextUrl.pathname === `/${locale}/`,
  );

  // Check for auth-related pages explicitly
  const isAuthPage =
    pathParts.length >= 2 &&
    locales.includes(pathParts[0] as any) &&
    ['login', 'signup', 'forgot-password', 'reset-password', 'auth-redirect'].includes(
      pathParts[1],
    );

  // Check if it's a public path more precisely
  const isPublicPath =
    publicPaths.some((path) => request.nextUrl.pathname === path) ||
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '//' ||
    isRootLocalePath ||
    isExplicitLocalePath ||
    isAuthPage ||
    request.nextUrl.pathname.includes('/auth-redirect');

  // Special handling for login path - ALWAYS consider it public
  const isLoginPage =
    pathParts.length >= 2 && locales.includes(pathParts[0] as any) && pathParts[1] === 'login';

  // Use a mutable variable for public path checks
  let mutableIsPublicPath = isPublicPath;
  if (isLoginPage && !mutableIsPublicPath) {
    console.log('Middleware - Login page detected, forcing public path status');
    mutableIsPublicPath = true;
  }

  // Update the immutable variable after all checks
  const isPublicPathFinal = mutableIsPublicPath;

  // Add debug logging for public path detection
  console.log('Middleware - Public path check:', {
    pathname: request.nextUrl.pathname,
    pathParts,
    isPublicPath: isPublicPathFinal,
    matchedExplicitPath: publicPaths.some((path) => request.nextUrl.pathname === path),
    isRootPath: request.nextUrl.pathname === '/',
    isRootLocalePath,
    isExplicitLocalePath,
    isLoginPage,
    isAuthPage,
    localeMatches: locales.filter((locale) => request.nextUrl.pathname.startsWith(`/${locale}`)),
    normPathname: request.nextUrl.pathname.replace(/\/+$/, ''), // Path with trailing slashes removed
  });

  if (isPublicPathFinal) {
    console.log('Public path detected, bypassing auth:', request.nextUrl.pathname);
    return NextResponse.next();
  }

  // 3. Auth check for protected routes - SIMPLIFIED
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  // Define protected paths clearly
  const protectedPaths = ['dashboard', 'admin', 'repositories', 'terminals', 'settings', 'trial'];

  // Explicitly bypass auth-redirect path
  if (request.nextUrl.pathname.includes('/auth-redirect')) {
    console.log('Auth redirect path detected, bypassing auth check');
    return NextResponse.next();
  }

  // Check if the path is protected
  const isProtectedRoute =
    isApiRoute ||
    protectedPaths.some((protectedPath) => {
      return pathParts.some((part) => part.toLowerCase() === protectedPath.toLowerCase());
    });

  console.log('Route protection check:', {
    path: request.nextUrl.pathname,
    isProtectedRoute,
    pathParts,
  });

  if (isProtectedRoute) {
    // Skip auth check for specific API endpoints
    if (request.nextUrl.pathname.startsWith('/api/hosts/byName')) {
      console.log('Bypassing auth for hosts API');
      return NextResponse.next();
    }

    // Allow RSC requests through
    if (request.nextUrl.search.includes('_rsc=')) {
      console.log('RSC request detected, allowing:', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.next();
    }

    try {
      // Create response and Supabase client for auth check
      const res = NextResponse.next();
      
      // Use consistent Supabase URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      
      // Create a simple client for auth
      const supabase = createServerClient(
        supabaseUrl,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: (name) => {
              const cookie = request.cookies.get(name);
              return cookie?.value;
            },
            set: (name, value, options) => {
              res.cookies.set({ name, value, ...options });
            },
            remove: (name, options) => {
              res.cookies.set({ name, value: '', ...options });
            },
          },
        },
      );

      // Get current session from cookies - simple single call
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error.message);
        
        if (isApiRoute) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        return createLoginRedirect(request, pathParts);
      }
      
      // Check if we have a valid session
      if (!data.session || !data.session.user || !data.session.user.email) {
        console.log('No valid session found, redirecting to login');
        
        if (isApiRoute) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        return createLoginRedirect(request, pathParts);
      }
      
      console.log('Valid session found:', {
        user: data.session.user.email,
        expires: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'unknown'
      });
      
      // Session is valid, continue with the request
      return res;
      
    } catch (error) {
      // Log any errors in token validation
      console.error('Error validating session:', error);

      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      return createLoginRedirect(request, pathParts);
    }
  }

  // 4. Apply internationalization middleware
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
