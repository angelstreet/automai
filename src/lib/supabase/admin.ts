// DO NOT MODIFY THIS FILE
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Cache the admin client
let adminClient: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Creates a Supabase admin client with service role permissions
 * - Uses service role key for privileged operations
 * - Falls back to anon key if service role not available (in development)
 * - Caches the client for efficiency
 */
export const createClient = () => {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Use service key if available, otherwise fall back to anon key
  const key = serviceKey || anonKey;

  if (!serviceKey) {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY not found, using anon key. Admin operations will be limited.',
    );
  }

  // Create and cache the admin client
  adminClient = createSupabaseClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });

  return adminClient;
};
