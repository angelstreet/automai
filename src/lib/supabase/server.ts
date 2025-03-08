import { createClient } from '@supabase/ssr';

import type { CookieOptions } from '@supabase/ssr';
import { getSupabaseUrl, getSupabaseAnonKey, validateSupabaseEnv } from './env';

// Validate environment variables on import
validateSupabaseEnv();

/**
 * Creates a Supabase client for server components and API routes
 * - Handles cookie management for authentication
 * - Uses appropriate environment variables
 */
export const createClient = async () => {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  
  // Resolve the cookie store properly
  const cookieStore = await cookies();
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      
      setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
        // In Next.js Server Components, we can't modify cookies directly
        // This is just a placeholder that logs a warning
        // To modify cookies, use middleware or API routes
        console.warn("setAll() cannot modify cookies inside Server Components.");
      },
    },
  });
};