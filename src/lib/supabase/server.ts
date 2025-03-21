//DO NOT MODIFY
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CookieOptions } from '@supabase/ssr';

type CookieStore = ReturnType<typeof cookies> extends Promise<infer T> ? T : never;

export const createClient = async (cookieStore?: any) => {
  // Use provided cookieStore or get a new one
  const cookieManager = cookieStore || await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => {
          return cookieManager.get(name)?.value;
        },
        set: (name, value, options) => {
          cookieManager.set({ name, value, ...options });
        },
        remove: (name, options) => {
          cookieManager.set({ name, value: '', ...options });
        },
        getAll: () => {
          return cookieManager.getAll();
        },
      },
    }
  );
};
