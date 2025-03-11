// DO NOT MODIFY THIS FILE
import { createBrowserClient } from '@supabase/ssr';

// Cache the client instance to avoid creating multiple instances
// that lead to GoTrueClient warnings
let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Creates a Supabase client for browser/client components
 * - Caches the client to prevent multiple instances
 * - Uses browser-specific implementation from @supabase/ssr
 */
export const createClient = async () => {
  if (typeof window === 'undefined') {
    throw new Error('createClient should only be called in browser/client components');
  }

  // Return cached instance if available
  if (browserClientInstance) {
    return browserClientInstance;
  }

  // Create and cache the client
  browserClientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return browserClientInstance;
};
