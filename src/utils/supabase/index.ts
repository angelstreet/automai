// Export all Supabase client utilities
export * from './client';
export * from './server';
export * from './middleware';

// Re-export common types from Supabase
export type { User, Session, AuthError, SupabaseClient } from '@supabase/supabase-js';