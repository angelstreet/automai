'use server';

import { supabaseAuth } from '@/lib/supabase/auth';
import { invalidateUserCache, ensureUserInDatabase } from './user';

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
 * Handle OAuth callback from Supabase Auth
 */
export async function handleAuthCallback(url: string) {
  try {
    // Parse the URL to get the code
    const { searchParams } = new URL(url);
    const code = searchParams.get('code');
    
    console.log('⭐ AUTH CALLBACK - Processing code from URL');
    
    if (!code) {
      console.error('⭐ AUTH CALLBACK ERROR - No code provided in URL');
      throw new Error('No code provided in URL');
    }
    
    // Invalidate user cache before processing callback
    await invalidateUserCache();
    console.log('⭐ AUTH CALLBACK - User cache invalidated');
    
    // Handle the OAuth callback
    console.log('⭐ AUTH CALLBACK - Exchanging code for session');
    const result = await supabaseAuth.handleOAuthCallback(code);
    
    if (result.error) {
      console.error('⭐ AUTH CALLBACK ERROR - Failed to exchange code:', result.error);
    }
    
    if (result.success && result.data) {
      console.log('⭐ AUTH CALLBACK SUCCESS - Session obtained');
      
      // Log session details for debugging
      const session = result.data.session;
      console.log('⭐ AUTH CALLBACK - Session present:', !!session);
      
      if (session) {
        console.log('⭐ AUTH CALLBACK - Session expires at:', new Date(session.expires_at * 1000).toISOString());
        console.log('⭐ AUTH CALLBACK - User ID:', session.user.id);
        console.log('⭐ AUTH CALLBACK - User email:', session.user.email);
      }
      
      // Ensure user exists in database after successful authentication
      console.log('⭐ AUTH CALLBACK - Ensuring user in database');
      await ensureUserInDatabase(result.data);
      
      // Get the tenant information for redirection
      const userData = result.data.session?.user;
      
      // Use tenant_name or default to 'trial'
      const tenantName = userData?.user_metadata?.tenant_name || 'trial';
      
      // Get the locale from URL or default to 'en'
      const pathParts = url.split('/');
      const localeIndex = pathParts.findIndex(part => part === 'auth-redirect') - 1;
      const locale = localeIndex >= 0 ? pathParts[localeIndex] : 'en';
      
      // Log for debugging
      console.log('⭐ AUTH CALLBACK - Redirect using tenant:', tenantName);
      
      // Redirect URL for after authentication
      const redirectUrl = `/${locale}/${tenantName}/dashboard`;
      
      return {
        success: true,
        redirectUrl
      };
    }
    
    // Handle authentication failure
    console.error('⭐ AUTH CALLBACK ERROR - Authentication failed:', result.error);
    return { 
      success: false, 
      error: result.error || 'Failed to authenticate', 
      redirectUrl: '/login?error=Authentication+failed'
    };
  } catch (error: any) {
    console.error('⭐ AUTH CALLBACK ERROR - Exception:', error);
    return { 
      success: false, 
      error: error.message || 'Authentication failed', 
      redirectUrl: '/login?error=Authentication+failed'
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
    
    if (result.success && result.data) {
      // Ensure user exists in database after successful signup
      await ensureUserInDatabase(result.data);
    }
    
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
    
    if (result.success && result.data) {
      // Ensure user exists in database after successful authentication
      await ensureUserInDatabase(result.data);
    }
    
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
    // Get locale from form data for redirect
    const locale = formData.get('locale') as string || 'en';
    
    // Invalidate user cache on sign out
    await invalidateUserCache();
    
    const result = await supabaseAuth.signOut();
    
    if (!result.success) {
      console.error('Error signing out:', result.error);
      throw new Error(result.error || 'Failed to sign out');
    }
    
    // Return success and redirect URL
    return { 
      success: true,
      redirectUrl: `/${locale}/login`
    };
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out');
  }
}

/**
 * Exchange code for session - simplified function for client components
 */
export async function exchangeCodeForSession(url: string) {
  return handleAuthCallback(url);
}
