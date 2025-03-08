'use server';

import { redirect } from 'next/navigation';
import { supabaseAuth, UserSession as AuthUserBase } from '@/lib/supabase/auth';

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

/**
 * Handle OAuth callback from Supabase Auth
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
    
    // Use the consolidated auth service
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
      redirectUrl
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
 * Sign up a new user
 */
export async function signUp(email: string, password: string, name: string, redirectUrl: string) {
  try {
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
    const result = await supabaseAuth.signInWithPassword(email, password);
    
    return { 
      success: result.success, 
      error: result.error || null, 
      data: result.data || null 
    };
  } catch (error: any) {
    console.error('Error signing in with password:', error);
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
    const result = await supabaseAuth.signOut();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to sign out');
    }
    
    // Get locale from form data or default to 'en'
    const locale = formData.get('locale') as string || 'en';
    
    // Redirect to login page
    redirect(`/${locale}/login`);
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out');
  }
}

/**
 * Update the current user's profile
 */
export async function updateProfile(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const locale = formData.get('locale') as string || 'en';
    
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
  try {
    const result = await supabaseAuth.getUser();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Not authenticated');
    }
    
    return result.data as AuthUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw new Error('Failed to get current user');
  }
} 