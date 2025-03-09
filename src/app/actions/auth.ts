'use server';

import { redirect } from 'next/navigation';
import { supabaseAuth} from '@/lib/supabase/auth';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  user_metadata?: {
    name?: string;
    tenant_id?: string;
  };
};

export type ProfileUpdateData = {
  name?: string;
  locale?: string;
};

// Track if we've already logged a "No active session" error
let noSessionErrorLogged = false;

// Cache for user data to reduce redundant checks
let userCache: {
  data: any | null;
  timestamp: number;
  error: string | null;
} | null = null;

// Cache expiration time (30 seconds)
const CACHE_EXPIRATION = 30 * 1000;

// Add a function to invalidate the cache when needed
export async function invalidateUserCache() {
  userCache = null;
  return { success: true };
}

/**
 * Handle OAuth callback from Supabase Auth
 * This follows the three-layer architecture: server action → server db
 */
export async function handleAuthCallback(url: string) {
  try {
    // Parse the URL to get the code
    const requestUrl = new URL(url);
    const code = requestUrl.searchParams.get('code');
    
    // If there's no code, return an error
    if (!code) {
      return { 
        success: false, 
        error: 'No authentication code provided',
        redirectUrl: null
      };
    }
    
    // Use the server DB layer (supabaseAuth service)
    const result = await supabaseAuth.handleOAuthCallback(code);
    
    if (!result.success || !result.data?.session) {
      return { 
        success: false, 
        error: result.error || 'Authentication failed',
        redirectUrl: null
      };
    }
    
    // Determine the redirect URL
    // Check if we have a locale in the URL
    const locale = requestUrl.pathname.split('/')[1] || 'en';
    const tenant = result.data.user.user_metadata?.tenant_id || 'default';
    const redirectUrl = `/${locale}/${tenant}/dashboard`;
    
    return {
      success: true,
      error: null,
      redirectUrl,
      data: result.data
    };
  } catch (error: any) {
    console.error('Error in handleAuthCallback:', error);
    return { 
      success: false, 
      error: error.message || 'Authentication failed',
      redirectUrl: null
    };
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, name: string, redirectUrl: string) {
  try {
    // Invalidate user cache before sign up
    await invalidateUserCache();
    
    const result = await supabaseAuth.signUp(email, password, {
      redirectTo: redirectUrl,
      data: { name }
    });
    
    return { 
      success: result.success, 
      error: result.error || null, 
      data: result.data || null 
    };
  } catch (error: any) {
    console.error('Error signing up:', error);
    return { success: false, error: error.message || 'Failed to sign up', data: null };
  }
}

/**
 * Sign in with password
 */
export async function signInWithPassword(email: string, password: string) {
  try {
    // Invalidate user cache before sign in
    await invalidateUserCache();
    
    const result = await supabaseAuth.signInWithPassword(email, password);
    
    return { 
      success: result.success, 
      error: result.error || null, 
      data: result.data || null 
    };
  } catch (error: any) {
    // Don't log Auth session missing errors as they're expected during login
    if (error.message !== 'Auth session missing!') {
      console.error('Error signing in with password:', error);
    }
    return { success: false, error: error.message || 'Failed to sign in', data: null };
  }
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: 'google' | 'github', redirectUrl: string) {
  try {
    const result = await supabaseAuth.signInWithOAuth(provider, { 
      redirectTo: redirectUrl 
    });
    
    return { 
      success: result.success, 
      error: result.error || null, 
      data: result.data || null 
    };
  } catch (error: any) {
    console.error('Error signing in with OAuth:', error);
    return { success: false, error: error.message || 'Failed to sign in', data: null };
  }
}

/**
 * Update user password
 */
export async function updatePassword(password: string) {
  try {
    // Invalidate user cache before updating password
    await invalidateUserCache();
    
    const result = await supabaseAuth.updatePassword(password);
    
    return { 
      success: result.success, 
      error: result.error || null 
    };
  } catch (error: any) {
    console.error('Error updating password:', error);
    return { success: false, error: error.message || 'Failed to update password' };
  }
}

/**
 * Reset password for email
 */
export async function resetPasswordForEmail(email: string, redirectUrl: string) {
  try {
    const result = await supabaseAuth.resetPasswordForEmail(email, redirectUrl);
    
    return {
      success: result.success,
      error: result.error || null
    };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return { success: false, error: error.message || 'Failed to reset password' };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(formData: FormData) {
  try {
    // Invalidate user cache on sign out
    await invalidateUserCache();
    
    const result = await supabaseAuth.signOut();
    
    if (!result.success) {
      console.error('Error signing out:', result.error);
      throw new Error(result.error || 'Failed to sign out');
    }
    
    // Return success instead of redirecting
    // Let the client handle the redirect
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out');
  }
}

/**
 * Update user profile
 */
export async function updateProfile(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const locale = formData.get('locale') as string || 'en';
    
    // Invalidate user cache before updating profile
    await invalidateUserCache();
    
    // Update user metadata
    const result = await supabaseAuth.updateProfile({ name });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update profile');
    }
    
    // Redirect back to profile page
    redirect(`/${locale}/profile`);
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  // Check if we have a valid cache
  const now = Date.now();
  if (userCache && (now - userCache.timestamp < CACHE_EXPIRATION)) {
    // Return cached data if available and not expired
    if (userCache.error) {
      // If the cached error is a session missing error, just return null
      if (userCache.error === 'No active session' || userCache.error === 'Auth session missing!') {
        return null;
      }
      throw new Error(userCache.error);
    }
    return userCache.data;
  }

  try {
    const result = await supabaseAuth.getUser();
    
    // Update cache
    userCache = {
      data: result.success ? result.data : null,
      timestamp: Date.now(),
      error: result.success ? null : result.error || null
    };
    
    if (!result.success || !result.data) {
      // For "No active session" errors or "Auth session missing!" errors, just return null instead of throwing an error
      if (result.error === 'No active session' || result.error === 'Auth session missing!') {
        return null;
      }
      
      // Reset the flag when we get a new error
      if (result.error !== 'No active session' && result.error !== 'Auth session missing!') {
        noSessionErrorLogged = false;
      }
      
      throw new Error(result.error || 'Not authenticated');
    }
    
    // Reset the flag when successful
    noSessionErrorLogged = false;
    return result.data as AuthUser;
  } catch (error) {
    // Update cache with error
    userCache = {
      data: null,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    // Only log if we haven't logged this specific error before
    if (error instanceof Error && 
        (error.message === 'No active session' || error.message === 'Auth session missing!') && 
        !noSessionErrorLogged) {
      console.error('Error getting current user:', error);
      noSessionErrorLogged = true;
      return null; // Return null instead of throwing for session-related errors
    } else if (!(error instanceof Error) || 
              (error.message !== 'No active session' && error.message !== 'Auth session missing!')) {
      // Always log other types of errors
      console.error('Error getting current user:', error);
    }
    
    // Only throw for errors other than session-related errors
    if (error instanceof Error && 
        (error.message === 'No active session' || error.message === 'Auth session missing!')) {
      return null;
    }
    
    throw new Error('Failed to get current user');
  }
} 