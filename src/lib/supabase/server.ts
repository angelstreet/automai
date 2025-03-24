//DO NOT MODIFY
import { createServerClient, CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = async () => {
  const cookieStore = cookies(); // Don't await here yet

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          // Await the cookieStore here
          return (await cookieStore).getAll().map((cookie) => ({ ...cookie }));
        },
        async setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            const resolvedCookies = await cookieStore;
            cookiesToSet.forEach(({ name, value, options }) => {
              resolvedCookies.set(name, value, options);
            });
          } catch {
            // Ignore if called from a Server Component with middleware refreshing sessions
          }
        },
      },
    }
  );
};