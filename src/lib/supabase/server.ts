//DO NOT MODIFY
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CookieOptions } from '@supabase/ssr';

type CookieStore = ReturnType<typeof cookies> extends Promise<infer T> ? T : never;

export const createClient = async (cookieStore?: CookieStore) => {
  const resolvedCookieStore: CookieStore = cookieStore ?? (await cookies());
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return resolvedCookieStore.getAll().map((cookie) => ({ ...cookie }));
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              resolvedCookieStore.set(name, value, options);
            });
          } catch {
            // Ignore if called from a Server Component with middleware refreshing sessions
          }
        },
      },
    },
  );
};