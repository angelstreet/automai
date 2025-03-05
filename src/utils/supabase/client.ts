// Optional import to handle when the package isn't installed in development
let createBrowserClient: any;
try {
  const supabaseSSR = require('@supabase/ssr');
  createBrowserClient = supabaseSSR.createBrowserClient;
} catch (error) {
  console.warn('Supabase SSR package not available, using mock client');
  createBrowserClient = null;
}

import { isUsingSupabase } from '@/lib/env';

export const createClient = () => {
  // Only create Supabase client if we're in production and have Supabase credentials
  if (!isUsingSupabase() || !createBrowserClient) {
    console.warn('Supabase client requested but not in production or missing credentials/package');
    return null;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
};
