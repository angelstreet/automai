import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey, getSupabaseAnonKey } from './env';

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
  
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  const key = serviceKey || getSupabaseAnonKey();
  
  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not found, using anon key. Admin operations will be limited.');
  }
  
  adminClient = createSupabaseClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });
  
  return adminClient;
};