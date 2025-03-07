import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isDevelopment } from '@/lib/env';

// Environment config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Get allowed origins for CORS
const getAllowedOrigins = (): string[] => {
  const origins = [
    // Always include localhost for development
    'http://localhost:3000',
    'http://localhost:3001',
    
    // Add Vercel app domains
    'https://*.vercel.app',
    
    // Add GitHub codespace domains
    'https://*.app.github.dev',
  ];
  
  // Add production domain if defined
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    origins.push(process.env.NEXT_PUBLIC_SITE_URL);
  }
  
  return origins;
};

// Singleton cache map for server clients
const clientCache = new Map<string, ReturnType<typeof createServerClient>>();

// Create a server-side Supabase client with cookies
export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  // Use service role key when available for increased privileges
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  const cacheKey = `server:${key}`;
  
  // Return cached client if available
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }
  
  if (isDevelopment()) {
    console.log(`[Supabase] Creating server client with URL: ${SUPABASE_URL}`);
  }
  
  // Create new client with CORS headers
  const client = createServerClient(SUPABASE_URL, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set(name, value, {
            ...options,
            // Ensure secure cookies in production
            secure: process.env.NODE_ENV === 'production',
            // Always set path to root
            path: '/',
          });
        } catch (error) {
          // Handle errors in Server Components where you cannot set cookies
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.delete(name, {
            ...options,
            path: '/',
          });
        } catch (error) {
          // Handle errors in Server Components where you cannot delete cookies
        }
      },
    },
    global: {
      headers: {
        'Access-Control-Allow-Origin': getAllowedOrigins().join(','),
        'Access-Control-Allow-Credentials': 'true',
        'X-Client-Info': 'supabase-js-server/2.38.4',
      }
    }
  });
  
  // Cache the client
  clientCache.set(cacheKey, client);
  
  return client;
};

// Create admin client with service role for privileged operations
export const createAdminClient = (cookieStore: ReturnType<typeof cookies>) => {
  if (!SUPABASE_SERVICE_KEY) {
    console.warn('Admin client requested but no service role key available');
    return createClient(cookieStore);
  }
  
  // Use unique cache key for admin client
  const cacheKey = `admin:${SUPABASE_SERVICE_KEY}`;
  
  // Return cached client if available
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }
  
  if (isDevelopment()) {
    console.log(`[Supabase] Creating admin client with URL: ${SUPABASE_URL}`);
  }
  
  // Create new admin client with service role
  const client = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set(name, value, {
            ...options,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
          });
        } catch (error) {
          // Handle errors in Server Components where you cannot set cookies
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.delete(name, {
            ...options,
            path: '/',
          });
        } catch (error) {
          // Handle errors in Server Components where you cannot delete cookies
        }
      },
    },
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'Access-Control-Allow-Origin': getAllowedOrigins().join(','),
        'Access-Control-Allow-Credentials': 'true',
        'X-Client-Info': 'supabase-js-admin/2.38.4',
      }
    }
  });
  
  // Cache the client
  clientCache.set(cacheKey, client);
  
  return client;
};