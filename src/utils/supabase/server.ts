import { cookies } from "next/headers";
import { isUsingSupabase } from "@/lib/env";

// Optional import to handle when the package isn't installed in development
let createServerClient: any;
try {
  const supabaseSSR = require("@supabase/ssr");
  createServerClient = supabaseSSR.createServerClient;
} catch (error) {
  console.warn('Supabase SSR package not available, using mock client');
  createServerClient = null;
}

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  // Only create Supabase client if we're in production and have Supabase credentials
  if (!isUsingSupabase() || !createServerClient) {
    console.warn('Supabase server client requested but not in production or missing credentials/package');
    return null;
  }
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};
