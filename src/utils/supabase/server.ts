import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";

// Validate environment variables at runtime
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables.");
}

// Define the function to create the Supabase client
export const createClient = async () => {
  // Resolve the cookie store properly
  const cookieStore = await cookies(); // Ensure it's awaited

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(), // Accessing getAll after resolving

      setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
        console.warn("setAll() cannot modify cookies inside Server Components.");
        // Next.js Server Components do not support modifying cookies directly
        // If you need to modify cookies, use middleware or API routes.
      },
    },
  });
};
