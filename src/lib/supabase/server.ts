//DO NOT MODIFY
import { createServerClient,CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Define CookieStore type based on the resolved return type of cookies()
type CookieStore = Awaited<ReturnType<typeof cookies>>;

export const createClient = async (cookieStore?: CookieStore) => {
  // If cookieStore is provided, use it; otherwise, await cookies()
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
    }
  );
};