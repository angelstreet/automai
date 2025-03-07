import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isDevelopment } from '@/lib/env';

// Environment config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const createClient = (request: NextRequest) => {
  // Don't handle Supabase auth callbacks with the middleware
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next();
  }

  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // For protecting cookies in production
        const secureOptions = {
          ...options,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax' as const,
        };
        
        request.cookies.set({
          name,
          value,
          ...secureOptions,
        });
        
        response.cookies.set({
          name,
          value,
          ...secureOptions,
        });
        
        if (isDevelopment()) {
          console.log(`[Middleware] Setting cookie: ${name}`);
        }
      },
      remove(name: string, options: CookieOptions) {
        const enhancedOptions = {
          ...options,
          path: '/',
        };
        
        request.cookies.delete({
          name,
          ...enhancedOptions,
        });
        
        response.cookies.delete({
          name,
          ...enhancedOptions,
        });
        
        if (isDevelopment()) {
          console.log(`[Middleware] Removing cookie: ${name}`);
        }
      },
    },
  });

  return { supabase, response };
};