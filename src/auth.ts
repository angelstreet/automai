// src/auth.ts
/**
 * Authentication utilities for working with Supabase Auth
 */

import { createClient, createAdminClient } from '@/lib/supabase';

// Types for Supabase auth
export interface UserSession {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string;
  tenant_id?: string;
  tenant_name?: string | null;
}

export interface SessionData {
  user: UserSession;
  accessToken: string;
  expires: string;
}

// Get the current session from Supabase
export async function getSession(): Promise<SessionData | null> {
  try {
    // Create a server client with cookies
    const supabase = await createClient();

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

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || null,
        image: user.user_metadata?.avatar_url || null,
        role: user.user_metadata?.role || 'user',
        tenant_id: user.user_metadata?.tenant_id || user.user_metadata?.tenantId || 'trial',
        tenant_name: user.user_metadata?.tenant_name || user.user_metadata?.tenantName || 'trial',
      },
      accessToken: access_token,
      expires: new Date(expires_at! * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Function to extract session from request headers
export async function extractSessionFromHeader(
  authHeader: string | null,
): Promise<SessionData | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    console.log('Extracting session from header token');

    // Create a Supabase admin client
    const supabase = createAdminClient();

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
        tenant_id: data.user.user_metadata?.tenant_id || data.user.user_metadata?.tenantId || 'trial',
        tenant_name: data.user.user_metadata?.tenant_name || data.user.user_metadata?.tenantName || 'trial',
      },
      accessToken: token,
      expires: new Date(Date.now() + 3600 * 1000).toISOString(), // Approximate expiry
    };
  } catch (error) {
    console.error('Error extracting session from header:', error);
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