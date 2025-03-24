'use server';

import { supabaseAuth } from '@/lib/supabase/auth';
import { AuthUser, ProfileData } from '@/types/user';

/********************************************
 * CACHE MANAGEMENT
 ********************************************/

// Cache for user data to reduce redundant checks
let userCache: {
  data: any | null;
  timestamp: number;
  error: string | null;
} | null = null;

// Cache expiration time (30 seconds for development - more frequent refreshes)
const CACHE_EXPIRATION = 30 * 1000;

// Track if we've already logged a "No active session" error
let noSessionErrorLogged = false;

// Add a function to invalidate the cache when needed
export async function invalidateUserCache() {
  console.log('[SERVER-CACHE] Invalidating user cache');
  userCache = null;

  // Also clear any client-side cache if possible
  if (typeof window !== 'undefined') {
    console.log('[CLIENT-CACHE] Clearing localStorage cache');
    localStorage.removeItem('user-data-cache');
    localStorage.removeItem('cached_user');
  }

  return { success: true, message: 'User cache invalidated' };
}

/**
 * Get the current authenticated user
 * Step 3: Enhanced to ensure complete user data is returned
 */
export async function getUser(): Promise<AuthUser | null> {
  console.log('[SERVER-ACTION] getUser called');

  // Check if we have a valid cache
  const now = Date.now();
  if (userCache) {
    // Check for shortLived flag - use a shorter expiration for auth errors
    const expirationTime = (userCache as any).shortLived ? 5000 : CACHE_EXPIRATION;
    
    // Only use cache if not expired
    if (now - userCache.timestamp < expirationTime) {
      console.log(
        '[SERVER-CACHE] Using cached user data, age:',
        Math.round((now - userCache.timestamp) / 1000),
        'seconds',
        (userCache as any).shortLived ? '(short-lived cache)' : ''
      );

      // Return cached data if available and not expired
      if (userCache.error) {
        // If the cached error is a session missing error, just return null
        if (userCache.error === 'No active session' || userCache.error === 'Auth session missing!') {
          console.log('[SERVER-CACHE] Returning null from cache (no session)');
          return null;
        }
        
        // If it's a refresh token error, invalidate cache
        if (userCache.error.includes('Refresh Token')) {
          console.log('[SERVER-CACHE] Previous refresh token error, invalidating cache');
          userCache = null;
          return null;
        }
        
        console.log('[SERVER-CACHE] Cached error:', userCache.error);
        throw new Error(userCache.error);
      }
    } else {
      console.log('[SERVER-CACHE] Cache expired, fetching fresh data');
      // Cache is expired, set to null to fetch fresh data
      userCache = null;
    }
  }
    
  // If we still have valid cache with data, verify the data has required fields
  if (userCache?.data) {
    if (userCache.data.tenant_id && userCache.data.tenant_name) {
      return userCache.data;
    } else {
      console.log('[SERVER-CACHE] Cached data missing required fields, fetching fresh data');
      // Cache is invalid, continue to fetch fresh data
    }
  }

  try {
    // Enhanced logging for debugging tenant issues
    console.log('[SERVER-ACTION] Getting user data from auth service');

    const result = await supabaseAuth.getUser();

    if (result.success && result.data) {
      // Verify the user data has all required fields and log complete structure
      console.log('[SERVER-ACTION] Auth service returned user data:', {
        id: result.data.id,
        hasTenantId: !!result.data.tenant_id,
        hasTenantName: !!result.data.tenant_name,
        email: result.data.email,
        hasRole: !!(result.data as any).role,
      });

      // Additional log to debug the exact structure
      console.log('[SERVER-ACTION] Full user data structure:', {
        ...result.data,
        // Don't log sensitive information
        user_metadata: result.data.user_metadata ? 'exists' : 'missing',
      });

      // Add role to result.data if needed
      if (!(result.data as any).role && result.data) {
        console.log('[SERVER-ACTION] Adding role to user data');
        (result.data as any).role = result.data.user_metadata?.role || 'viewer';
      }
    } else {
      console.error('[SERVER-ACTION] Failed to get user data:', result.error);
    }

    // Update cache with a longer expiration for successful auth
    userCache = {
      data: result.success ? result.data : null,
      timestamp: Date.now(),
      error: result.success ? null : result.error || null,
    };

    console.log('[SERVER-CACHE] User cache updated, success:', result.success);

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
    // Common auth errors should not be cached for long periods
    // especially refresh token errors, session errors, and auth missing errors
    const isCommonAuthError = error instanceof Error && (
      error.message.includes('Refresh Token') || 
      error.message.includes('session') ||
      error.message.includes('auth')
    );
    
    if (isCommonAuthError) {
      console.log('[SERVER-CACHE] Auth error, using shorter cache or no cache');
      // Either don't cache at all, or use a very short cache time for auth errors
      if (error.message.includes('Refresh Token')) {
        console.log('[SERVER-CACHE] Refresh token error, not caching');
        userCache = null;
      } else {
        // Very short cache (5 seconds) for other auth errors
        userCache = {
          data: null,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error',
          // Add a flag to indicate this is a short-lived cache
          shortLived: true
        };
      }
    } else {
      // Update cache with error for non-auth errors
      userCache = {
        data: null,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    console.log('[SERVER-CACHE] Cached error:', userCache.error);

    // Only log if we haven't logged this specific error before
    if (
      error instanceof Error &&
      (error.message === 'No active session' || error.message === 'Auth session missing!') &&
      !noSessionErrorLogged
    ) {
      console.error('Error getting current user:', error);
      noSessionErrorLogged = true;
      return null; // Return null instead of throwing for session-related errors
    } else if (
      !(error instanceof Error) ||
      (error.message !== 'No active session' && error.message !== 'Auth session missing!')
    ) {
      // Always log other types of errors
      console.error('Error getting current user:', error);
    }

    // Only throw for errors other than session-related errors
    if (
      error instanceof Error &&
      (error.message === 'No active session' || error.message === 'Auth session missing!')
    ) {
      return null;
    }

    throw new Error('Failed to get current user');
  }
}

/**
 * Update Profile
 */
export async function updateProfile(formData: FormData | ProfileData) {
  try {
    // Extract data - handle both FormData and direct objects
    let name, locale, avatar_url, role;

    if (formData instanceof FormData) {
      name = formData.get('name') as string;
      locale = (formData.get('locale') as string) || 'en';
      avatar_url = formData.get('avatar_url') as string;
      role = formData.get('role') as string;
    } else {
      name = formData.name;
      locale = formData.locale || 'en';
      avatar_url = formData.avatar_url;
      role = (formData as any).role;
    }

    console.log('Updating profile with name:', name, 'and role:', role);

    // Invalidate user cache before updating profile
    await invalidateUserCache();

    // Prepare metadata object with all provided fields
    const metadata: Record<string, any> = {};
    if (name) metadata.name = name;
    if (locale) metadata.locale = locale;
    if (avatar_url) metadata.avatar_url = avatar_url;
    if (role) metadata.role = role;

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
