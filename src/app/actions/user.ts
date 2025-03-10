'use server';

import { supabaseAuth } from '@/lib/supabase/auth';
import { 
  UserRole, 
  UserRoleResponse, 
  SingleUserRoleResponse, 
  Tenant,
  AuthUser, 
  ProfileData 
} from '@/types/user';

/********************************************
 * CACHE MANAGEMENT
 ********************************************/

// Cache for user data to reduce redundant checks
let userCache: {
  data: any | null;
  timestamp: number;
  error: string | null;
} | null = null;

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Track if we've already logged a "No active session" error
let noSessionErrorLogged = false;

// Add a function to invalidate the cache when needed
export async function invalidateUserCache() {
  userCache = null;
  return { success: true };
}

/********************************************
 * AUTHENTICATION OPERATIONS
 ********************************************/

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
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
    // Only log once per session for debugging
    console.log('[Auth] Using getUser from cache or fetch');
    const result = await supabaseAuth.getUser();
    
    // Update cache with a longer expiration for successful auth
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

/********************************************
 * USER PROFILE OPERATIONS
 ********************************************/

/**
 * Update user profile
 */
export async function updateProfile(formData: FormData | ProfileData) {
  try {
    // Extract data - handle both FormData and direct objects
    let name, locale, avatar_url;
    
    if (formData instanceof FormData) {
      name = formData.get('name') as string;
      locale = formData.get('locale') as string || 'en';
      avatar_url = formData.get('avatar_url') as string;
    } else {
      name = formData.name;
      locale = formData.locale || 'en';
      avatar_url = formData.avatar_url;
    }
    
    console.log('Updating profile with name:', name);
    
    // Invalidate user cache before updating profile
    await invalidateUserCache();
    
    // Prepare metadata object with all provided fields
    const metadata: Record<string, any> = {};
    if (name) metadata.name = name;
    if (locale) metadata.locale = locale;
    if (avatar_url) metadata.avatar_url = avatar_url;
    
    // Update user metadata
    const result = await supabaseAuth.updateProfile(metadata);
    
    if (!result.success) {
      console.error('Failed to update profile:', result.error);
      throw new Error(result.error || 'Failed to update profile');
    }
    
    console.log('Profile updated successfully');
    
    // Return success instead of redirecting
    // Let the client handle state updates
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }
}

/**
 * Update user profile with detailed data
 */
export async function updateUserProfile(data: ProfileData): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Updating user profile with data:', data);
    
    // Make sure we have valid data
    if (!data.name && !data.avatar_url && !data.locale) {
      return { success: false, error: 'No data provided for update' };
    }
    
    // Get current user to compare values
    const currentUser = await supabaseAuth.getUser();
    if (!currentUser.success || !currentUser.data) {
      return { success: false, error: 'Could not retrieve current user data' };
    }
    
    // Check if there are actual changes
    const user = currentUser.data;
    const currentName = user.name || user.user_metadata?.name || '';
    const currentAvatar = user.image || user.user_metadata?.avatar_url || '';
    
    // Skip update if no actual changes
    if ((data.name && data.name === currentName) && 
        (data.avatar_url && data.avatar_url === currentAvatar)) {
      console.log('No changes detected, skipping profile update');
      return { success: true };
    }
    
    // Build user_metadata object
    const metadata: Record<string, any> = {};
    if (data.name) metadata.name = data.name;
    if (data.avatar_url) metadata.avatar_url = data.avatar_url;
    if (data.locale) metadata.locale = data.locale;
    
    // Call the Supabase auth service to update user metadata
    const result = await supabaseAuth.updateProfile(metadata);
    
    // Log result for debugging
    if (result.success) {
      console.log('Profile updated successfully');
    } else {
      console.error('Failed to update profile:', result.error);
    }
    
    return { 
      success: result.success, 
      error: result.error || undefined 
    };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const result = await supabaseAuth.getUser();
    
    return { 
      success: result.success, 
      error: result.error || undefined,
      data: result.data
    };
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message || 'Failed to get user profile' };
  }
}

/********************************************
 * USER ROLES OPERATIONS
 ********************************************/

/**
 * Get user roles for a specific user
 */
export async function getUserRoles(userId: string): Promise<UserRoleResponse> {
  try {
    // Get the user details from supabaseAuth
    const result = await supabaseAuth.getUserById(userId);
    
    if (!result.success || !result.data) {
      return { success: false, error: 'User not found' };
    }
    
    const user = result.data;
    
    // Extract role from user metadata
    const role = user.user_metadata?.role || 'user';
    
    // Create a UserRole object
    const userRole: UserRole = {
      id: userId,
      name: role,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || new Date().toISOString()
    };
    
    return { success: true, data: [userRole] };
  } catch (error: any) {
    console.error('Error in getUserRoles:', error);
    return { success: false, error: error.message || 'Failed to fetch user roles' };
  }
}

/**
 * Create or update a user role
 */
export async function createUserRole(data: Partial<UserRole>): Promise<SingleUserRoleResponse> {
  try {
    if (!data.id) {
      return { success: false, error: 'User ID is required' };
    }
    
    // Get current user details
    const userResult = await supabaseAuth.getUserById(data.id);
    
    if (!userResult.success || !userResult.data) {
      return { success: false, error: 'User not found' };
    }
    
    // Update user metadata with new role
    const updateResult = await supabaseAuth.updateUserMetadata(data.id, {
      role: data.name
    });
    
    if (!updateResult.success) {
      return { success: false, error: updateResult.error || 'Failed to update user role' };
    }
    
    const userRole: UserRole = {
      id: data.id,
      name: data.name || 'user',
      created_at: userResult.data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return { success: true, data: userRole };
  } catch (error: any) {
    console.error('Error in createUserRole:', error);
    return { success: false, error: error.message || 'Failed to create user role' };
  }
}

/**
 * Update a user role
 */
export async function updateUserRole(id: string, updates: Partial<UserRole>): Promise<SingleUserRoleResponse> {
  try {
    // Get current user details
    const userResult = await supabaseAuth.getUserById(id);
    
    if (!userResult.success || !userResult.data) {
      return { success: false, error: 'User not found' };
    }
    
    // Update user metadata with new role
    const updateResult = await supabaseAuth.updateUserMetadata(id, {
      role: updates.name
    });
    
    if (!updateResult.success) {
      return { success: false, error: updateResult.error || 'Failed to update user role' };
    }
    
    const userRole: UserRole = {
      id,
      name: updates.name || userResult.data.user_metadata?.role || 'user',
      created_at: userResult.data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return { success: true, data: userRole };
  } catch (error: any) {
    console.error('Error in updateUserRole:', error);
    return { success: false, error: error.message || 'Failed to update user role' };
  }
}

/**
 * Delete (reset) a user role
 */
export async function deleteUserRole(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Reset the role to 'user' by updating metadata
    const updateResult = await supabaseAuth.updateUserMetadata(id, {
      role: 'user'
    });
    
    if (!updateResult.success) {
      return { success: false, error: updateResult.error || 'Failed to reset user role' };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteUserRole:', error);
    return { success: false, error: error.message || 'Failed to delete user role' };
  }
}

/**
 * Get roles for the current user
 */
export async function getCurrentUserRoles(): Promise<UserRoleResponse> {
  try {
    const userResult = await supabaseAuth.getUser();
    
    if (!userResult.success || !userResult.data) {
      // Return a default role for unauthenticated users instead of an error
      if (userResult.error === 'Auth session missing!' || userResult.error === 'No active session') {
        return { 
          success: true, 
          data: [{ 
            id: 'guest', 
            name: 'guest',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }] 
        };
      }
      return { success: false, error: 'No user found' };
    }
    
    // Extract role from user metadata
    const role = userResult.data.user_metadata?.role || 'user';
    
    // Create a UserRole object
    const userRole: UserRole = {
      id: userResult.data.id,
      name: role,
      created_at: userResult.data.created_at || new Date().toISOString(),
      updated_at: userResult.data.updated_at || new Date().toISOString()
    };
    
    return { success: true, data: [userRole] };
  } catch (error: any) {
    console.error('Error in getCurrentUserRoles:', error);
    return { success: false, error: error.message || 'Failed to get current user roles' };
  }
}

/********************************************
 * TENANT OPERATIONS
 ********************************************/

/**
 * Get tenants for a user
 */
export async function getTenants(userId: string): Promise<{ success: boolean; error?: string; data?: Tenant[] }> {
  try {
    // Get the user to check which tenant they belong to
    const user = await supabaseAuth.getUser();
    
    if (!user.success || !user.data) {
      return { success: false, error: 'User not found' };
    }
    
    // Get the tenant_id from user metadata
    const tenantId = user.data.tenant_id;
    
    // If we don't have a tenant ID, return a default trial tenant
    if (!tenantId) {
      return { 
        success: true, 
        data: [{
          id: 'trial',
          name: 'Trial',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      };
    }
    
    // Return the tenant based on user metadata
    return { 
      success: true, 
      data: [{
        id: tenantId,
        name: user.data.user_metadata?.tenant_name || tenantId,
        created_at: user.data.created_at || new Date().toISOString(),
        updated_at: user.data.updated_at || new Date().toISOString()
      }]
    };
  } catch (error: any) {
    console.error('Error in getTenants:', error);
    return { success: false, error: error.message || 'Failed to fetch tenants' };
  }
}

/**
 * Switch tenant for a user
 */
export async function switchTenant(tenantName: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('switchTenant: Switching to tenant:', tenantName);
    
    // Update the user profile with tenant_name
    const result = await supabaseAuth.updateProfile({ 
      tenant_name: tenantName
    });
    
    return { 
      success: result.success, 
      error: result.error || undefined 
    };
  } catch (error: any) {
    console.error('Error switching tenant:', error);
    return { success: false, error: error.message || 'Failed to switch tenant' };
  }
}

/********************************************
 * HELPER FUNCTIONS
 ********************************************/

// Helper function to ensure user exists in database
async function ensureUserInDatabase(authData: any): Promise<void> {
  try {
    if (!authData || !authData.user) {
      console.error('No auth data provided to ensureUserInDatabase');
      return;
    }

    const userId = authData.user.id;
    
    // Extract user data for database record
    const userData = {
      id: userId,
      email: authData.user.email,
      name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User',
      role: authData.user.user_metadata?.role || 'admin',
      tenant_name: authData.user.app_metadata?.tenant_name || 'trial',
      provider: authData.user.app_metadata?.provider || 'email',
    };
    
    // Use the supabaseAuth service to ensure user in database
    await supabaseAuth.ensureUserInDb(userData);
    
    console.log('User record created or verified successfully');
  } catch (error) {
    console.error('Error ensuring user in database:', error);
    // Don't fail the authentication process if this fails
  }
}