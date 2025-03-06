import { type NextRequest, NextResponse } from 'next/server';
import { isUsingSupabase } from '@/lib/env';
import { CookieOptions } from '@supabase/ssr';

// Optional import to handle when the package isn't installed in development
let createServerClient: any;
try {
  const supabaseSSR = require('@supabase/ssr');
  createServerClient = supabaseSSR.createServerClient;
} catch (error) {
  console.warn('Supabase SSR package not available, using mock client');
  createServerClient = null;
}

interface Cookie {
  name: string;
  value: string;
  options?: CookieOptions;
}

export const createClient = (request: NextRequest) => {
  // Don't handle Supabase auth callbacks with the middleware
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next();
  }

  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Only create Supabase client if we're in production and have Supabase credentials
  if (!isUsingSupabase() || !createServerClient) {
    console.warn(
      'Supabase middleware client requested but not in production or missing credentials/package',
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Cookie[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  return supabaseResponse;
};
