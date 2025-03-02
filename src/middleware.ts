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

// Helper function to create login redirect response
function createLoginRedirect(request: NextRequest, pathParts: string[]) {
  // Extract locale from URL for redirect
  const locale = pathParts[0];
  // Fix type error by asserting locale is a valid locale type
  const validLocale = locales.includes(locale as any) ? locale as typeof locales[number] : defaultLocale;
  
  // Redirect to login with the current URL as the callbackUrl
  const loginUrl = new URL(`/${validLocale}/login`, request.url);
  loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
  console.log('Redirecting to:', loginUrl.toString());
  
  // Force clear any session cookies that might be causing issues
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete('next-auth.session-token');
  response.cookies.delete('__Secure-next-auth.session-token');
  
  return response;
}

export default async function middleware(request: NextRequest) {
  console.log('Middleware processing:', request.nextUrl.pathname);
  
  // DEBUG: Log cookies for debugging
  console.log('Cookies present:', 
    request.cookies.getAll().map(c => `${c.name}: ${c.value.substring(0, 10)}...`));
  
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
    (pathParts.length === 1 && locales.includes(pathParts[0] as any)) ||
    // Public API routes
    (request.nextUrl.pathname.startsWith('/api/auth/')) ||
    // Auth redirect page (with locale and route group)
    (request.nextUrl.pathname.includes('/auth-redirect'));
  
  // For root or locale-only paths, check if user is logged in and redirect to dashboard
  if ((request.nextUrl.pathname === '/' || (pathParts.length === 1 && locales.includes(pathParts[0] as any))) && 
      !request.nextUrl.pathname.includes('/login')) {
    try {
      // Check for all possible session token cookie names
      const sessionTokenCookie = request.cookies.get('next-auth.session-token') || 
                               request.cookies.get('__Secure-next-auth.session-token');
      
      console.log('Login redirect check, found session token:', !!sessionTokenCookie);
      
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: process.env.NODE_ENV === 'production',
        // Check both possible cookie names
        cookieName: sessionTokenCookie?.name || 'next-auth.session-token',
      });
      
      console.log('Dashboard redirect check:', { 
        hasToken: !!token,
        tokenFields: token ? Object.keys(token) : [],
        sessionCookie: sessionTokenCookie?.name
      });
      
      if (token && typeof token === 'object' && token.id && token.email) {
        // User is logged in, redirect to dashboard
        const locale = pathParts.length === 1 ? pathParts[0] : defaultLocale;
        const validLocale = locales.includes(locale as any) ? locale as typeof locales[number] : defaultLocale;
        const dashboardUrl = new URL(`/${validLocale}/dashboard`, request.url);
        console.log('User is logged in, redirecting to dashboard:', dashboardUrl.toString());
        return NextResponse.redirect(dashboardUrl);
      }
    } catch (error) {
      console.error('Error checking token for dashboard redirect:', error);
    }
  }
  
  if (isPublicPath) {
    // Special handling for profile API 404 responses
    if (request.nextUrl.pathname.includes('/api/auth/profile')) {
      // Store original response to check status later
      const response = await NextResponse.next();
      
      // If profile API returns 404, clear session and redirect to login for non-API requests
      if (response.status === 404) {
        console.log('Profile API returned 404, user not found in database');
        
        // For API requests, just return the 404
        if (request.headers.get('accept')?.includes('application/json')) {
          return response;
        }
        
        // For browser requests, redirect to login
        return createLoginRedirect(request, pathParts);
      }
      
      return response;
    }
    
    console.log('Public path detected, bypassing auth:', request.nextUrl.pathname);
    return NextResponse.next();
  }

  // 3. Auth check for protected routes
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  
  // More precise protected route detection
  const protectedPaths = ['dashboard', 'admin', 'repositories', 'terminals', 'settings', 'trial'];
  
  // Check if any part of the path matches a protected path
  const isProtectedRoute = isApiRoute || 
    protectedPaths.some(protectedPath => {
      // For each path part, check if it matches a protected path
      return pathParts.some(part => part === protectedPath);
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
    
    try {
      // Check for all possible session token cookie names and log their presence
      const sessionCookies = [
        request.cookies.get('next-auth.session-token'),
        request.cookies.get('__Secure-next-auth.session-token')
      ].filter(Boolean);
      
      console.log('Session cookies present:', sessionCookies.map(c => c?.name));
      
      // Get and validate token - use strict validation
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: process.env.NODE_ENV === 'production',
        // Use specific cookie name if available
        cookieName: sessionCookies[0]?.name || 'next-auth.session-token',
      });
      
      // Log token details for debugging (safely)
      console.log('Auth token check:', { 
        path: request.nextUrl.pathname, 
        hasToken: !!token,
        hasValidData: token ? (!!token.email && !!token.id) : false,
        tokenExp: token?.exp ? new Date(Number(token.exp) * 1000).toISOString() : null,
        now: new Date().toISOString(),
        tokenFields: token ? Object.keys(token) : []
      });
      
      // Validate that the token exists and has required fields
      const isValidToken = !!token && 
                          typeof token === 'object' &&
                          typeof token.id === 'string' && 
                          typeof token.email === 'string' && 
                          (!token.exp || (typeof token.exp === 'number' && token.exp * 1000 > Date.now()));
      
      // Only check token validity in middleware - UserContext will handle 404s for deleted users
      if (!isValidToken) {
        console.log('Invalid token for protected route:', request.nextUrl.pathname);
        
        if (isApiRoute) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        return createLoginRedirect(request, pathParts);
      }
      
      // For protected UI routes, check if user exists in database via profile API
      // But only for non-API routes and only if we're not in development mode
      if (!isApiRoute) {
        try {
          // Make a request to the profile API to check if user exists
          // Use the same host as the current request to avoid CORS issues
          const host = request.headers.get('host') || 'localhost:3000';
          const protocol = host.includes('localhost') ? 'http' : 'https';
          const profileUrl = `${protocol}://${host}/api/auth/profile`;
          
          console.log('Checking user profile at:', profileUrl);
          
          // Use a longer timeout to prevent issues during server startup
          const timeoutMs = 10000; // 10 seconds
          
          const profileResponse = await fetch(profileUrl, {
            headers: {
              cookie: request.headers.get('cookie') || '',
              'Content-Type': 'application/json',
            },
            // Add a timeout to prevent hanging
            signal: AbortSignal.timeout(timeoutMs),
          });
          
          // If profile API returns 404, user doesn't exist in database
          if (profileResponse.status === 404) {
            console.log('User not found in database, redirecting to login');
            return createLoginRedirect(request, pathParts);
          }
          
          // If we get any other error status, also redirect to login
          if (!profileResponse.ok) {
            console.log(`Profile API returned ${profileResponse.status}, redirecting to login`);
            return createLoginRedirect(request, pathParts);
          }
          
          // User exists and is valid, continue
          console.log('User profile validated successfully');
        } catch (fetchError) {
          // If fetch fails, log the error but don't block the request
          // This prevents issues with the middleware blocking all requests if the profile API is down
          console.error('Error checking user profile:', fetchError);
          
          // Allow the request to continue even if profile check fails
          // This prevents users from being logged out after server restart
          console.log('Allowing request despite profile check failure');
          return NextResponse.next();
        }
      }
      
    } catch (error) {
      // Log any errors in token validation
      console.error('Error validating token:', error);
      
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
