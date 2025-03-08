import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseUrl, getSupabaseAnonKey } from './env';

/**
 * Creates a Supabase client for middleware
 * - Handles cookie management for authentication in middleware
 * - Allows updating cookies in the response
 */
export const createClient = (request: NextRequest) => {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  
  // Create response to manipulate cookies
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  // Create client with cookie handlers for middleware
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => {
        return request.cookies.get(name)?.value;
      },
      
      set: (name, value, options) => {
        // This captures and sends the Set-Cookie headers back
        // from the supabase-js client to be set from edge functions
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      
      remove: (name, options) => {
        // This captures and sends the Set-Cookie headers back
        // from the supabase-js client to be set from edge functions
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });
  
  return { supabase, response };
};

/**
 * Updates the Supabase session in middleware
 * This handles:
 * - Token refreshing
 * - Session validation
 * - Redirecting unauthenticated users
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  try {
    // Create Supabase client for this middleware phase
    const { supabase, response } = createClient(request);
    
    // Get the session - this will refresh tokens if needed
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Redirect to login if no session
    if (error || !session) {
      // Extract locale from path
      const locale = request.nextUrl.pathname.split('/')[1] || 'en';
      const validLocale = ['en', 'fr'].includes(locale) ? locale : 'en';
      
      // Redirect to login page with locale
      const redirectUrl = new URL(`/${validLocale}/login`, request.url);
      return NextResponse.redirect(redirectUrl);
    }
    
    return response;
  } catch (error) {
    console.error('Error in updateSession:', error);
    
    // Redirect to login on error
    const locale = request.nextUrl.pathname.split('/')[1] || 'en';
    const validLocale = ['en', 'fr'].includes(locale) ? locale : 'en';
    
    const redirectUrl = new URL(`/${validLocale}/login`, request.url);
    return NextResponse.redirect(redirectUrl);
  }
}