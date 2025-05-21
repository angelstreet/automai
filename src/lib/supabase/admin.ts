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
  if (adminClient) {
    console.log('[@admin:createClient] Using cached admin client');
    return adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Use service key if available, otherwise fall back to anon key
  const key = serviceKey || anonKey;

  console.log(`[@admin:createClient] Creating admin client with URL: ${supabaseUrl}`);
  console.log(`[@admin:createClient] Service key available: ${!!serviceKey}`);

  if (!serviceKey) {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY not found, using anon key. Admin operations will be limited.',
    );
  } else {
    console.log(`[@admin:createClient] Service key length: ${serviceKey.length}`);
    // Log first and last few characters of key for debugging (avoid logging the entire key for security)
    console.log(`[@admin:createClient] Service key prefix: ${serviceKey.substring(0, 5)}...`);
    console.log(
      `[@admin:createClient] Service key suffix: ...${serviceKey.substring(serviceKey.length - 5)}`,
    );
  }

  try {
    // Create and cache the admin client
    adminClient = createSupabaseClient(supabaseUrl, key, {
      auth: { persistSession: false },
    });

    console.log('[@admin:createClient] Admin client created successfully');
    return adminClient;
  } catch (error) {
    console.error('[@admin:createClient] Error creating admin client:', error);
    throw error;
  }
};
