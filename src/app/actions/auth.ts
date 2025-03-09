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

// User creation is now handled directly in the handleAuthCallback function
// This ensures users are only created in the database during their first sign-in
// rather than on every authentication attempt

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
      // Get user info from the session
      const userData = result.data.session?.user;
      
      if (!userData) {
        throw new Error('No user data in session');
      }
      
      const userId = userData.id;
      
      // First check if this user already exists in our database
      console.log('Checking if user exists in database:', userId);
      
      // Import the admin client with elevated permissions
      const { createAdminClient } = await import('@/lib/supabase');
      const adminClient = createAdminClient();
      
      // Use admin client to check if user exists (bypasses RLS)
      const { data: existingUser, error: findError } = await adminClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (findError && findError.code !== 'PGRST116') {
        console.error('Error finding user:', findError);
      }
      
      // Only create the user if this is their first sign-in (user doesn't exist in our database yet)
      if (!existingUser) {
        console.log('First-time sign-in detected, creating user record...');
        
        try {
          // Extract user data for database record
          const userDataForDb = {
            id: userId,
            email: userData.email,
            name: userData.user_metadata?.name || userData.email?.split('@')[0] || 'User',
            user_role: 'pro',
            tenant_id: 'a317a10a-776a-47de-9347-81806b36a03e', // Use the existing tenant ID
            provider: userData.app_metadata?.provider || 'email',
          };
          
          // Create the user record with admin client
          console.log('Creating new user record in database:', userDataForDb.email);
          const { data: newUser, error: createUserError } = await adminClient
            .from('users')
            .insert(userDataForDb)
            .select()
            .single();
            
          if (createUserError) {
            console.error('Error creating user:', createUserError);
            throw createUserError;
          }
          
          // Update the user's metadata to include their name
          const { error: updateError } = await adminClient.auth.admin.updateUserById(
            userId,
            { 
              user_metadata: { 
                name: userDataForDb.name,
                tenant_id: userDataForDb.tenant_id
              } 
            }
          );
          
          if (updateError) {
            console.error('Error updating user metadata:', updateError);
          } else {
            console.log('User metadata updated with name and tenant_id');
          }
          
          console.log('User record created successfully during first sign-in');
        } catch (dbError) {
          // Log the error but don't fail the authentication
          console.error('Error creating user during first-time sign-in:', dbError);
        }
      } else {
        console.log('User already exists in database:', userId);
      }
      
      // Get the tenant ID for redirection - use from existing user if available, or default
      const tenantId = existingUser?.tenant_id || 'a317a10a-776a-47de-9347-81806b36a03e';
      
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
    
    // Removed call to ensureUserInDatabase - will be handled during auth redirect
    
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
    
    // Removed call to ensureUserInDatabase - will be handled during auth redirect
    
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
export async function updateProfile(formData: FormData | ProfileUpdateData) {
  try {
    // Extract data - handle both FormData and direct objects
    let name, locale;
    
    if (formData instanceof FormData) {
      name = formData.get('name') as string;
      locale = formData.get('locale') as string || 'en';
    } else {
      name = formData.name;
      locale = formData.locale || 'en';
    }
    
    console.log('Updating profile with name:', name);
    
    // Invalidate user cache before updating profile
    await invalidateUserCache();
    
    // Update user metadata
    const result = await supabaseAuth.updateProfile({ name });
    
    if (!result.success) {
      console.error('Failed to update profile:', result.error);
      throw new Error(result.error || 'Failed to update profile');
    }
    
    console.log('Profile updated successfully');
    
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

    // Log the raw user data to inspect metadata structure
    console.log('[Auth] Raw user data from session:', JSON.stringify(user, null, 2));
    
    // Enhance the user object with processed metadata for easier access
    if (user.user_metadata) {
      // Extract name from various possible metadata fields
      const metadata = user.user_metadata;
      user.name = metadata.name || 
                 metadata.full_name || 
                 (metadata as any)?.raw_user_meta_data?.name ||
                 metadata.preferred_username ||
                 user.email?.split('@')[0] || 
                 null;
    }

    // Cache the result
    userCache = {
      data: user,
      timestamp: Date.now(),
      error: null,
    };

    return user;
  } catch (err) {
    console.error('[Auth] Error getting current user:', err);
    
    // Cache the error to avoid repeated API calls
    userCache = {
      data: null,
      timestamp: Date.now(),
      error: err instanceof Error ? err.message : 'Unknown error',
    };
    
    return null;
  }
} 