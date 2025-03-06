// src/auth.ts
/**
 * Authentication utilities for working with Supabase Auth
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { createServerSupabase } from '@/lib/supabase';

// Types for Supabase auth
export interface UserSession {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string;
  tenantId?: string;
  tenantName?: string | null;
}

export interface SessionData {
  user: UserSession;
  accessToken: string;
  expires: string;
}

// Singleton instance - initialize as null
let supabaseInstance: any = null;

// Create a server-side Supabase client with cookies
export async function createSupabaseServerClient() {
  // Return existing instance if available
  if (supabaseInstance) {
    console.log('Reusing existing Supabase instance');
    return supabaseInstance;
  }

  // Get the Supabase URL from environment or use localhost as default
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  
  // Log the URL being used
  console.log('Creating new Supabase server client with URL:', supabaseUrl);
  
  // Create a cookie handler that doesn't rely on the cookies() API
  const cookieStore = cookies();
  
  // Create a server client with simplified cookie handling
  supabaseInstance = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          // Simple cookie getter
          return cookieStore.get(name)?.value || '';
        },
        set(name, value, options) {
          // Simple cookie setter
          cookieStore.set(name, value, options);
        },
        remove(name, options) {
          // Simple cookie remover
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
  
  return supabaseInstance;
}

// Function to extract session from request headers
export async function extractSessionFromHeader(authHeader: string | null): Promise<SessionData | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    console.log('Extracting session from header token');
    
    // Create a Supabase client with no cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: () => '',
          set: () => {},
          remove: () => {},
        },
      }
    );
    
    // Get the user from the token
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      console.error('Error getting user from token:', error?.message);
      return null;
    }
    
    // Return the session data
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || null,
        image: data.user.user_metadata?.avatar_url || null,
        role: data.user.user_metadata?.role || 'user',
        tenantId: data.user.user_metadata?.tenantId || 'trial',
        tenantName: data.user.user_metadata?.tenantName || 'trial',
      },
      accessToken: token,
      expires: new Date(Date.now() + 3600 * 1000).toISOString(), // Approximate expiry
    };
  } catch (error) {
    console.error('Error extracting session from header:', error);
    return null;
  }
}

// Get the current session from Supabase
export async function getSession(): Promise<SessionData | null> {
  try {
    // Create a server client
    const supabase = await createSupabaseServerClient();
    
    // Try to get the session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    if (!data.session) {
      console.log('No session found');
      return null;
    }
    
    const { user, access_token, expires_at } = data.session;
    
    console.log('Session found for user:', user.id);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || null,
        image: user.user_metadata?.avatar_url || null,
        role: user.user_metadata?.role || 'user',
        tenantId: user.user_metadata?.tenantId || 'trial',
        tenantName: user.user_metadata?.tenantName || 'trial',
      },
      accessToken: access_token,
      expires: new Date(expires_at! * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Get the current user from Supabase
export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

// Helper function to check if a user is authenticated
export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}

// Reset the singleton instance (useful for testing)
export function resetSupabaseClient() {
  console.log('Resetting Supabase client instance');
  supabaseInstance = null;
}
