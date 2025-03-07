// Export client utilities
export { createClient as createBrowserClient } from './client';

// Export server utilities
export { createClient as createServerClient, createAdminClient } from './server';

// Export middleware utilities
export { createClient as createMiddlewareClient } from './middleware';

// Re-export common types from Supabase
export type { User, Session, AuthError, SupabaseClient } from '@supabase/supabase-js';