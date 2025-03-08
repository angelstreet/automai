'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
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
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code for session:', error);
      return { 
        success: false, 
        error: error.message,
        redirectUrl: null
      };
    }
    
    if (!data.session) {
      return { 
        success: false, 
        error: 'No session returned from authentication',
        redirectUrl: null
      };
    }
    
    // Determine the redirect URL
    // Check if we have a locale in the URL
    const locale = requestUrl.pathname.split('/')[1] || 'en';
    const tenant = data.user.user_metadata?.tenant_id || 'default';
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
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name }
      }
    });
    
    if (error) {
      console.error('Error signing up:', error.message);
      return { success: false, error: error.message, data: null };
    }
    
    return { success: true, error: null, data };
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
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Error signing in with password:', error.message);
      return { success: false, error: error.message, data: null };
    }
    
    return { success: true, error: null, data };
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
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl
      }
    });
    
    if (error) {
      console.error('Error signing in with OAuth:', error.message);
      return { success: false, error: error.message, data: null };
    }
    
    return { success: true, error: null, data };
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
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { error } = await supabase.auth.updateUser({
      password
    });
    
    if (error) {
      console.error('Error updating password:', error.message);
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
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
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    
    if (error) {
      console.error('Error resetting password:', error.message);
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
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
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    await supabase.auth.signOut();
    
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
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const name = formData.get('name') as string;
    const locale = formData.get('locale') as string || 'en';
    
    // Update user metadata
    const { error } = await supabase.auth.updateUser({
      data: { name }
    });
    
    if (error) {
      console.error('Error updating profile:', error.message);
      throw new Error('Failed to update profile');
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
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error('Not authenticated');
    }
    
    return user as AuthUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw new Error('Failed to get current user');
  }
} 