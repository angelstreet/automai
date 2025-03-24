'use server';

import { supabaseAuth } from '@/lib/supabase/auth';
import { AuthUser, ProfileData } from '@/types/user';
import { serverCache } from '@/lib/cache';

// Constants for cache management
const USER_CACHE_TTL = 30 * 1000; // 30 seconds for user data
const AUTH_ERROR_TTL = 5 * 1000; // 5 seconds for auth errors
const USER_CACHE_KEY = 'current-user';

/**
 * Invalidate user-related cache
 */
export async function invalidateUserCache() {
  // Clear all user-related cache entries
  const deletedCount = serverCache.deleteByTag('user-data');

  // Also clear any client-side cache if possible
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user-data-cache');
    localStorage.removeItem('cached_user');
  }

  return {
    success: true,
    message: `User cache invalidated (${deletedCount} entries cleared)`,
  };
}

/**
 * Get the current authenticated user with enhanced server-side caching
 *
 * @returns The authenticated user or null if not authenticated
 */
export async function getUser(): Promise<AuthUser | null> {
  // Use enhanced server cache with proper error handling
  try {
    return await serverCache.getOrSet(
      USER_CACHE_KEY,
      async () => {
        try {
          // Get user from auth service
          const result = await supabaseAuth.getUser();

          if (!result.success || !result.data) {
            // Handle common auth errors
            if (result.error === 'No active session' || result.error === 'Auth session missing!') {
              return null;
            }

            throw new Error(result.error || 'Not authenticated');
          }

          // Verify and enhance user data
          if (result.data) {
            // Add role if missing
            if (!(result.data as any).role) {
              (result.data as any).role = result.data.user_metadata?.role || 'viewer';
            }

            // Validate required fields
            if (!result.data.tenant_id || !result.data.tenant_name) {
              console.warn('[getUser] User data missing tenant information:', {
                hasTenantId: !!result.data.tenant_id,
                hasTenantName: !!result.data.tenant_name,
              });
            }
          }

          return result.data as AuthUser;
        } catch (error) {
          // Handle session-related errors specially
          if (
            error instanceof Error &&
            (error.message === 'No active session' || error.message === 'Auth session missing!')
          ) {
            return null;
          }

          // Re-throw other errors
          throw error;
        }
      },
      {
        ttl: USER_CACHE_TTL,
        tags: ['user-data', 'auth'],
        source: 'getUser',
      },
    );
  } catch (error) {
    // For auth errors, use a shorter TTL
    const isAuthError =
      error instanceof Error &&
      (error.message.includes('Refresh Token') ||
        error.message.includes('session') ||
        error.message.includes('auth'));

    // Don't cache refresh token errors at all
    if (error instanceof Error && error.message.includes('Refresh Token')) {
      serverCache.delete(USER_CACHE_KEY);
      return null;
    }

    // Log the error but don't re-throw for auth errors
    console.error('Error getting current user:', error);

    // For auth errors, return null instead of throwing
    if (isAuthError) {
      return null;
    }

    throw new Error('Failed to get current user');
  }
}

/**
 * Update user profile
 *
 * @param formData Form data or profile data object
 * @returns Result object with success status
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

    // Clean up cache - delete any user-related cache entries
    // This ensures fresh data will be fetched next time
    serverCache.deleteByTag('user-data');

    // Return success with the updated user data if available
    return {
      success: true,
      data: result.data || null,
      message: 'Profile updated successfully',
    };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update profile');
  }
}
