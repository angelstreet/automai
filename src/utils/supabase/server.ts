import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Environment config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Singleton instance for server
let serverClient: ReturnType<typeof createServerClient> | null = null;

// Create a server-side Supabase client with cookies
export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  // Use service role key when available for increased privileges
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

  return createServerClient(SUPABASE_URL, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set(name, value, options);
        } catch (error) {
          // Handle errors in Server Components where you cannot set cookies
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.delete(name, options);
        } catch (error) {
          // Handle errors in Server Components where you cannot delete cookies
        }
      },
    },
  });
};

// Create admin client with service role for privileged operations
export const createAdminClient = (cookieStore: ReturnType<typeof cookies>) => {
  if (!SUPABASE_SERVICE_KEY) {
    console.warn('Admin client requested but no service role key available');
    return createClient(cookieStore);
  }
  
  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set(name, value, options);
        } catch (error) {
          // Handle errors in Server Components where you cannot set cookies
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.delete(name, options);
        } catch (error) {
          // Handle errors in Server Components where you cannot delete cookies
        }
      },
    },
    auth: {
      persistSession: false,
    }
  });
};