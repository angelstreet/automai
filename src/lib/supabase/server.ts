// DO NOT MODIFY THIS FILE
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";

// Define the cookie store type based on what cookies() returns
type CookieStore = ReturnType<typeof cookies> extends Promise<infer T> ? T : never;

export const createClient = async (cookieStore?: CookieStore) => {
  // If cookieStore is not provided, await it
  const resolvedCookieStore: CookieStore = cookieStore ?? (await cookies());

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Simply spread the cookie object as it already has name, value, and other properties
          return resolvedCookieStore.getAll().map((cookie) => ({
            ...cookie,
          }));
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              resolvedCookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
};