'use server';

import { redirect } from 'next/navigation';
import { supabaseAuth} from '@/lib/supabase/auth';
import db from '@/lib/supabase/db';

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

// Helper function to ensure user exists in database
async function ensureUserInDatabase(authData: any): Promise<void> {
  try {
    if (!authData || !authData.user) {
      console.error('No auth data provided to ensureUserInDatabase');
      return;
    }

    const userId = authData.user.id;
    
    // Check if user already exists in database
    const existingUser = await db.user.findUnique({
      where: { id: userId }
    });
    
    if (existingUser) {
      // User exists, optionally update their metadata
      console.log('User exists in database, no need to create:', userId);
      return;
    }
    
    // Extract metadata from auth user
    const userData = {
      id: userId,
      email: authData.user.email,
      name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User',
      user_role: authData.user.user_metadata?.role || 'viewer', // Use user_role column
      tenant_id: authData.user.user_metadata?.tenant_id || 'trial',
      provider: authData.user.app_metadata?.provider || 'email',
    };
    
    // Create default tenant if it doesn't exist
    let tenant = await db.tenant.findUnique({
      where: { id: 'trial' }
    });
    
    if (!tenant) {
      console.log('Creating default trial tenant');
      tenant = await db.tenant.create({
        data: {
          id: 'trial',
          name: 'Trial',
          plan: 'free',
        }
      });
    }
    
    // Create user record in database
    console.log('Creating new user record in database:', userData.email);
    await db.user.create({
      data: userData
    });
    
    console.log('User record created successfully');
  } catch (error) {
    console.error('Error ensuring user in database:', error);
    // Don't fail the authentication process if this fails
  }
}

/**
 * Handle OAuth callback from Supabase Auth
 * This follows the three-layer architecture: server action → server db
 */
export async function handleAuthCallback(url: string) {
  try {
    // Parse the URL to get the code
    const { searchParams } = new URL(url);
    const code = searchParams.get('code');
    
    if (!code) {
      throw new Error('No code provided in URL');
    }
    
    // Invalidate user cache before processing callback
    await invalidateUserCache();
    
    // Handle the OAuth callback
    const result = await supabaseAuth.handleOAuthCallback(code);
    
    if (result.success && result.data) {
      // Ensure user exists in database after successful authentication
      await ensureUserInDatabase(result.data);
      
      // Get the tenant ID for redirection
      const userData = result.data.session?.user;
      const tenantId = userData?.user_metadata?.tenant_id || 'trial';
      
      // Get the locale from URL or default to 'en'
      const pathParts = url.split('/');
      const localeIndex = pathParts.findIndex(part => part === 'auth-redirect') - 1;
      const locale = localeIndex >= 0 ? pathParts[localeIndex] : 'en';
      
      // Redirect URL for after authentication
      const redirectUrl = `/${locale}/${tenantId}/dashboard`;
      
      return {
        success: true,
        redirectUrl
      };
    }
    
    // Handle authentication failure
    return { 
      success: false, 
      error: result.error || 'Failed to authenticate', 
      redirectUrl: '/login?error=Authentication+failed'
    };
  } catch (error: any) {
    console.error('Error in handleAuthCallback:', error);
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
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (userCache && (Date.now() - userCache.timestamp < CACHE_EXPIRATION)) {
    // Return cached data if it's fresh
    if (userCache.error) {
      // If there was an error, throw it again
      throw new Error(userCache.error);
    }
    return userCache.data;
  }

  try {
    // Create a new session
    const { data, error } = await supabaseAuth.getSession();

    if (error) {
      // Don't log "No active session" error too many times
      if (error === 'No active session' && noSessionErrorLogged) {
        // Already logged once, don't flood logs
      } else if (error === 'No active session') {
        console.log('[Auth] No active session. User not authenticated.');
        noSessionErrorLogged = true;
      } else {
        console.error('[Auth] Error getting user session:', error);
      }

      // Cache the error to avoid repeated API calls
      userCache = {
        data: null,
        timestamp: Date.now(),
        error: error,
      };

      return null;
    }

    // Reset the flag when we get a valid session
    noSessionErrorLogged = false;

    // Get the user data - handle type safely
    // Check if data is defined and has a session object with user
    const sessionData = data as unknown as { session?: { user?: AuthUser } };
    const user = sessionData?.session?.user || null;

    if (!user) {
      console.log('[Auth] No user found in session');
      
      // Cache the result
      userCache = {
        data: null,
        timestamp: Date.now(),
        error: null,
      };
      
      return null;
    }

    // Cache the user data
    userCache = {
      data: user,
      timestamp: Date.now(),
      error: null,
    };

    return user;
  } catch (error: any) {
    console.error('[Auth] Error in getCurrentUser:', error.message);
    
    // Cache the error
    userCache = {
      data: null,
      timestamp: Date.now(),
      error: error.message,
    };
    
    throw error;
  }
} 