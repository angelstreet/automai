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
  const locale = pathParts[0];
  // Fix type error by asserting locale is a valid locale type
  const validLocale = locales.includes(locale as any)
    ? (locale as (typeof locales)[number])
    : defaultLocale;

  // Redirect to login with the current URL as the callbackUrl
  const loginUrl = new URL(`/${validLocale}/login`, request.url);
  loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
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

  // 1. WebSocket handling
  if (request.headers.get('upgrade')?.includes('websocket')) {
    console.log('WebSocket request detected, bypassing middleware');
    return NextResponse.next();
  }

  // Explicitly bypass authentication redirects for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
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
    '/auth-redirect',  // Root auth redirect path
    '/en/auth-redirect',  // Localized auth redirect paths
    '/fr/auth-redirect',
    '/test-auth',        // Test auth page for debugging
    '/error',
    '/_next',
    '/favicon.ico',
    '/api/hosts/byName',
    '/api/terminals/init',
    '/api/terminals/ws',
  ];

  // Extract path parts for better matching
  const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
  
  // Add locale-based home paths to public paths
  locales.forEach(locale => {
    publicPaths.push(`/${locale}`);
    publicPaths.push(`/${locale}/`);
  });

  // Check if it's a public path more precisely
  const isPublicPath =
    publicPaths.some((path) => request.nextUrl.pathname === path) ||
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '//' ||
    (pathParts.length === 1 && locales.includes(pathParts[0] as any)) ||
    request.nextUrl.pathname.includes('/auth-redirect');
    
  // Add debug logging for public path detection
  console.log('Public path check:', {
    pathname: request.nextUrl.pathname,
    pathParts,
    isPublicPath,
    matchedExplicitPath: publicPaths.some((path) => request.nextUrl.pathname === path),
    isRootPath: request.nextUrl.pathname === '/',
    isLocaleRoot: pathParts.length === 1 && locales.includes(pathParts[0] as any),
    normPathname: request.nextUrl.pathname.replace(/\/+$/, '') // Path with trailing slashes removed
  });

  if (isPublicPath) {
    console.log('Public path detected, bypassing auth:', request.nextUrl.pathname);
    return NextResponse.next();
  }
  
  // Additional check for root paths with or without locales
  // This ensures URLs like /en/ are treated as public
  if (
    request.nextUrl.pathname === '/' || 
    request.nextUrl.pathname === '//' ||
    locales.some(locale => 
      request.nextUrl.pathname === `/${locale}` || 
      request.nextUrl.pathname === `/${locale}/`
    )
  ) {
    console.log('Root path detected, bypassing auth:', request.nextUrl.pathname);
    return NextResponse.next();
  }

  // 3. Auth check for protected routes
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  // More precise protected route detection
  const protectedPaths = ['dashboard', 'admin', 'repositories', 'terminals', 'settings', 'trial'];

  console.log('pathParts:', pathParts);
  // Be more explicit about auth-redirect path to ensure it's not mistakenly protected
  if (request.nextUrl.pathname.includes('/auth-redirect')) {
    console.log('Auth redirect path detected, bypassing auth check');
    return NextResponse.next();
  }

  // Check if any part of the path matches a protected path
  const isProtectedRoute =
    isApiRoute ||
    protectedPaths.some((protectedPath) => {
      // For each path part, check if it matches a protected path
      return pathParts.some((part) => part === protectedPath);
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

    try {
      // Create Supabase client for auth
      const res = NextResponse.next();
      
      // Determine if we need to use the Codespace URL
      let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const isCodespace = 
        process.env.CODESPACE && 
        process.env.CODESPACE_NAME && 
        process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
      
      if (isCodespace) {
        // Construct the Supabase URL to match what's in the browser
        const codespaceHost = process.env.CODESPACE_NAME;
        const codespaceDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
        
        // Make sure we don't include any app port in the Supabase URL
        // Extract just the codespace project name without any port numbers
        let codespaceBase = codespaceHost || '';
        const portMatch = codespaceBase.match(/(.*?)(-\d+)$/);
        if (portMatch && portMatch[1]) {
          codespaceBase = portMatch[1]; // Just the base name without port
          console.log(`Middleware: Detected Codespace base name: ${codespaceBase} (removed port from ${codespaceHost})`);
        }
        
        // Always use -54321 suffix for Supabase
        supabaseUrl = `https://${codespaceBase}-54321.${codespaceDomain}`;
        console.log('Middleware using Codespace Supabase URL:', supabaseUrl);
      }
      
      // First, try to extract token from Authorization header if present
      const authHeader = request.headers.get('Authorization');
      let session = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        console.log('Middleware: Authorization header found, using token');
        const token = authHeader.substring(7);
        
        try {
          // Create a one-time client to verify the token
          const verifyClient = createServerClient(
            supabaseUrl,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              cookies: {
                get: () => null,
                set: () => {},
                remove: () => {},
              },
            }
          );
          
          // Verify the token
          const { data, error } = await verifyClient.auth.getUser(token);
          
          if (data?.user && !error) {
            console.log('Middleware: Valid token in Authorization header');
            // Create a session object
            session = {
              user: data.user,
              expires_at: Math.floor(Date.now() / 1000) + 3600, // Approximate 1 hour validity
              access_token: token
            };
          } else {
            console.log('Middleware: Invalid token in Authorization header:', error?.message);
          }
        } catch (error) {
          console.error('Middleware: Error verifying token from header:', error);
        }
      }
      
      // If no valid session from header, try cookies
      if (!session) {
        console.log('Middleware: No valid token in header, checking cookies');
        
        // Create a client for cookie-based auth
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

        // Get current session from cookies
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }

      console.log('Auth session check:', {
        path: request.nextUrl.pathname,
        hasSession: !!session,
        hasUser: !!session?.user,
        hasValidEmail: !!session?.user?.email,
        sessionExpiry: session?.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
        now: new Date().toISOString(),
      });

      // Validate that session exists and has required user data
      const isValidToken =
        !!session &&
        !!session.user &&
        !!session.user.email &&
        (!session.expires_at || session.expires_at * 1000 > Date.now());

      // Enhanced debug logging
      if (!isValidToken) {
        console.log('Token validation failed:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          hasEmail: !!session?.user?.email,
          isExpired: session?.expires_at ? session.expires_at * 1000 <= Date.now() : false,
          expiryTime: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'n/a',
          currentTime: new Date().toISOString(),
        });
      }

      // Only check token validity in middleware
      if (!isValidToken) {
        console.log('Invalid token for protected route:', request.nextUrl.pathname);

        // Attempt to refresh the session before failing
        if (session && session.user) {
          try {
            console.log('Attempting to refresh session for user:', session.user.id);
            
            // Create a fresh client for refresh attempt
            const refreshClient = createServerClient(
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
              }
            );
            
            // Try to refresh the session
            const { data, error } = await refreshClient.auth.refreshSession();
            
            if (data?.session && !error) {
              console.log('Session refreshed successfully');
              session = data.session;
              
              // Check if the refreshed token is valid
              const isRefreshedTokenValid =
                !!session &&
                !!session.user &&
                !!session.user.email &&
                (!session.expires_at || session.expires_at * 1000 > Date.now());
              
              if (isRefreshedTokenValid) {
                console.log('Refreshed token is valid, continuing with request');
                // Continue with the request using the refreshed token
                return res;
              }
            } else {
              console.log('Failed to refresh session:', error?.message);
            }
          } catch (refreshError) {
            console.error('Error refreshing session:', refreshError);
          }
        }

        if (isApiRoute) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return createLoginRedirect(request, pathParts);
      }

      // For protected UI routes, verify user record in database
      if (!isApiRoute && session?.user?.id) {
        try {
          // Check if user exists in Supabase database
          const { data: user, error } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (error || !user) {
            console.log('User not found in database, redirecting to login');
            return createLoginRedirect(request, pathParts);
          }

          console.log('User record validated successfully');
        } catch (error) {
          // Log error but allow request to continue
          console.error('Error checking user record:', error);
          console.log('Allowing request despite database check failure');
        }
      }

      // Attach the Supabase session to the response so it can be used by the app
      return res;
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
