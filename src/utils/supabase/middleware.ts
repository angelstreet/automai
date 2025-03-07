import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isDevelopment } from '@/lib/env';

// Environment config - only use cloud config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wexkgcszrwxqsthahfyq.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// Fail-fast if no key is provided
if (!SUPABASE_ANON_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined!');
}

// Determine cookie domain based on request hostname
const getCookieDomain = (hostname: string): string => {
  // GitHub Codespaces: use github.dev domain
  if (hostname.includes('.app.github.dev')) {
    return '.app.github.dev';
  }
  
  // Vercel: handle both preview and production
  if (hostname.includes('.vercel.app')) {
    return '.vercel.app';
  }
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '';
  }
  
  // Production domain - extract the root domain
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return `.${parts.slice(-2).join('.')}`;
  }
  
  return '';
};

// Get allowed origins for CORS
const getAllowedOrigins = (): string[] => {
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://*.vercel.app',
    'https://*.app.github.dev',
    process.env.NEXT_PUBLIC_SITE_URL || '',
  ].filter(Boolean);
};

// Singleton cache for middleware clients
const middlewareClientCache = new Map<string, any>();

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
  
  // Add CORS headers to the response
  const origin = request.headers.get('origin');
  if (origin) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow specific origins or wildcard match
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  }
  
  // Get cookie domain
  const hostname = request.headers.get('host') || '';
  const cookieDomain = getCookieDomain(hostname);
  
  if (isDevelopment()) {
    console.log(`[Middleware] Using cookie domain: ${cookieDomain || '(none)'}`);
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Enhanced cookie options
        const secureOptions = {
          ...options,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          domain: cookieDomain,
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
          console.log(`[Middleware] Setting cookie: ${name} with domain ${cookieDomain || '(none)'}`);
        }
      },
      remove(name: string, options: CookieOptions) {
        const enhancedOptions = {
          ...options,
          path: '/',
          domain: cookieDomain,
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
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-middleware/2.38.4',
      }
    }
  });

  return { supabase, response };
};