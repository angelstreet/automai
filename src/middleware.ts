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
      // For each path part, check if it matches a protected path (case insensitive)
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

    // Check for RSC requests and bypass auth check if needed
    if (request.nextUrl.search.includes('_rsc=')) {
      console.log(
        'Middleware - RSC request detected in protected route, allowing:',
        request.nextUrl.pathname + request.nextUrl.search,
      );
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
          console.log(
            `Middleware: Detected Codespace base name: ${codespaceBase} (removed port from ${codespaceHost})`,
          );
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
            },
          );

          // Verify the token
          const { data, error } = await verifyClient.auth.getUser(token);

          if (data?.user && !error) {
            console.log('Middleware: Valid token in Authorization header');
            // Create a session object
            session = {
              user: data.user,
              expires_at: Math.floor(Date.now() / 1000) + 3600, // Approximate 1 hour validity
              access_token: token,
            };
          } else {
            console.log('Middleware: Invalid token in Authorization header:', error?.message);
          }
        } catch (error) {
          console.error('Middleware: Error verifying token from header:', error);
        }
      }

      // Check for manual token cookie if no session yet
      if (!session) {
        const manualTokenCookie = request.cookies.get('sb-manual-token');
        if (manualTokenCookie?.value) {
          console.log('Middleware: Found manual token cookie, using it');
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
              },
            );

            // Verify the token from manual cookie
            const { data, error } = await verifyClient.auth.getUser(manualTokenCookie.value);

            if (data?.user && !error) {
              console.log('Middleware: Valid manual token cookie');
              // Create a session object
              session = {
                user: data.user,
                expires_at: Math.floor(Date.now() / 1000) + 3600, // Approximate 1 hour validity
                access_token: manualTokenCookie.value,
              };
            } else {
              console.log('Middleware: Invalid manual token cookie:', error?.message);
            }
          } catch (error) {
            console.error('Middleware: Error verifying manual token cookie:', error);
          }
        }
      }

      // Check for user-session cookie as a last resort
      if (!session) {
        const userSessionCookie = request.cookies.get('user-session');
        if (userSessionCookie?.value) {
          console.log('Middleware: Found user-session cookie, attempting to use it');

          try {
            // We can't fully validate this cookie since it only contains user ID
            // But we can check if the user exists in the database

            // Create a client for database queries
            const supabase = createServerClient(
              supabaseUrl,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              {
                cookies: {
                  get: (name) => {
                    const cookie = request.cookies.get(name);
                    return cookie?.value;
                  },
                  set: () => {},
                  remove: () => {},
                },
              },
            );

            // Check if the user ID exists in the database
            const { data: user, error } = await supabase
              .from('users')
              .select('id, email')
              .eq('id', userSessionCookie.value)
              .single();

            if (user && !error) {
              console.log('Middleware: Valid user-session cookie, user exists in database');
              // Create a minimal session object
              // This is enough to pass middleware but will need to be refreshed
              session = {
                user: {
                  id: user.id,
                  email: user.email,
                  app_metadata: {},
                  user_metadata: {},
                  aud: 'authenticated',
                  created_at: '',
                },
                expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour temporary validity
                access_token: 'temporary-from-user-session-cookie',
              };

              // Add a header to indicate this is a fallback session
              // This can be used by the client to know it should refresh the session
              res.headers.set('X-Auth-Session-Fallback', 'true');
            } else {
              console.log(
                'Middleware: Invalid user-session cookie or user not in database:',
                error?.message,
              );
            }
          } catch (error) {
            console.error('Middleware: Error verifying user-session cookie:', error);
          }
        }
      }

      // If no valid session from header or manual cookie, try cookies
      if (!session) {
        console.log(
          'Middleware: No valid token in header or manual cookie, checking Supabase cookies',
        );

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

      // Enhanced validation with more detailed debugging
      // Always log token details for protected routes
      console.log('Middleware - Token validation details:', {
        path: request.nextUrl.pathname,
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email ? `${session.user.email.substring(0, 5)}...` : null,
        expiryTimestamp: session?.expires_at,
        expiryFormatted: session?.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : 'n/a',
        currentTime: new Date().toISOString(),
        isExpired: session?.expires_at ? session.expires_at * 1000 <= Date.now() : false,
        tokenLength: session?.access_token ? session.access_token.length : 0,
        cookieCount: request.cookies.getAll().length,
      });

      // Validate that session exists and has required user data
      const isValidToken =
        !!session &&
        !!session.user &&
        !!session.user.email &&
        (!session.expires_at || session.expires_at * 1000 > Date.now());

      // Enhanced debug logging
      if (!isValidToken) {
        console.log('Middleware - Token validation failed:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          hasEmail: !!session?.user?.email,
          isExpired: session?.expires_at ? session.expires_at * 1000 <= Date.now() : false,
          expiryTime: session?.expires_at
            ? new Date(session.expires_at * 1000).toISOString()
            : 'n/a',
          currentTime: new Date().toISOString(),
          route: request.nextUrl.pathname,
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
              },
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

        // Normalize the pathname to lowercase before creating the redirect
        const normalizedPathname = request.nextUrl.pathname.toLowerCase();
        const normalizedRequest = new NextRequest(new URL(normalizedPathname, request.url), {
          headers: request.headers,
        });

        return createLoginRedirect(
          normalizedRequest,
          normalizedPathname.split('/').filter(Boolean),
        );
      }

      // For protected UI routes, verify user record in database
      if (!isApiRoute && session?.user?.id) {
        try {
          // Create a database client for user verification
          const dbClient = createServerClient(
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

          // Check if user exists in Supabase database
          const { data: user, error } = await dbClient
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
