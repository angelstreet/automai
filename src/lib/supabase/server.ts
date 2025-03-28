//DO NOT MODIFY THIS FILE
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = async (cookieStore?: any) => {
  // Use provided cookieStore or get a new one
  const cookieJar = cookieStore || (await cookies());

  // Get all cookies and convert to headers
  const allCookies = await Promise.all(
    cookieJar
      .getAll()
      .map(async (c: { name: string; value: string }) => ['cookie', `${c.name}=${c.value}`]),
  );

  // Create request headers
  const requestHeaders = new Headers(allCookies);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name) {
          const cookie = await cookieJar.get(name);
          return cookie?.value;
        },
        async set(name, value, options) {
          try {
            // Only modify cookies in Server Actions or Route Handlers
            // This check helps prevent the "Cookies can only be modified in a Server Action or Route Handler" error
            if (
              requestHeaders.get('next-action') ||
              requestHeaders.get('x-supabase-server-action')
            ) {
              cookieJar.set(name, value, options);
            } else {
              // Log that we're skipping setting cookie in an RSC context
              console.log(`[Supabase] Skipping cookie set for ${name} in RSC context`);
            }
          } catch (error) {
            console.error(`[Supabase] Error setting cookie ${name}:`, error);
          }
        },
        async remove(name, options) {
          try {
            // Only modify cookies in Server Actions or Route Handlers
            if (
              requestHeaders.get('next-action') ||
              requestHeaders.get('x-supabase-server-action')
            ) {
              cookieJar.set(name, '', { ...options, maxAge: 0 });
            } else {
              // Log that we're skipping removing cookie in an RSC context
              console.log(`[Supabase] Skipping cookie removal for ${name} in RSC context`);
            }
          } catch (error) {
            console.error(`[Supabase] Error removing cookie ${name}:`, error);
          }
        },
      },
    },
  );
};
