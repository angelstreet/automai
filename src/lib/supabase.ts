/**
 * @deprecated - This file is deprecated and will be removed in a future version.
 * Please use the @/utils/supabase/client, @/utils/supabase/server, or @/utils/supabase/middleware exports instead.
 * 
 * The default export is maintained for backward compatibility but should not be used in new code.
 */

import { createClient } from '@supabase/supabase-js';
import { isProduction, isDevelopment } from './env';

// Environment config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Create a deprecated Supabase client with minimal functionality
// This is only for compatibility with existing code and should be removed in the future
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: typeof window !== 'undefined',
    detectSessionInUrl: typeof window !== 'undefined',
  }
});

// Export the deprecated client
export default supabase;

// Also provide a warning when importing anything from this file
console.warn(
  'Warning: imports from src/lib/supabase.ts are deprecated and will be removed in a future version. ' +
  'Please use @/utils/supabase/* imports instead.'
);