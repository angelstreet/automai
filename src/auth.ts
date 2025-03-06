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

// Create a server-side Supabase client with cookies
export async function createSupabaseServerClient() {
  const cookieStore = cookies();
  
  // Get the Supabase URL from environment or use localhost as default
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  
  // Log the URL being used
  console.log('Creating Supabase server client with URL:', supabaseUrl);
  
  return createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        set: (name: string, value: string, options: any) => {
          cookieStore.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// Get the current session from Supabase
export async function getSession(): Promise<SessionData | null> {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase.auth.getSession();
    
    if (error || !data.session) {
      return null;
    }
    
    const { user, access_token, expires_at } = data.session;
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || null,
        image: user.user_metadata?.avatar_url || null,
        role: user.user_metadata?.role || 'user',
        tenantId: user.user_metadata?.tenantId || 'trial',
        tenantName: user.user_metadata?.tenantName || 'Trial',
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
