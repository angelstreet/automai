'use server';

import { supabaseAuth } from '@/lib/supabase/auth';
import { AuthUser, ProfileData } from '@/types/user';

/**
 * Invalidate user-related cache
 * Now just clears any client-side storage, as SWR handles caching
 */
export async function invalidateUserCache() {
  // Clear any client-side cache if possible
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user-data-cache');
    localStorage.removeItem('cached_user');
  }

  return {
    success: true,
    message: 'User cache invalidated',
  };
}

/**
 * Get the current authenticated user
 * Uses Next.js caching for stability during SSR/RSC
 *
 * @returns The authenticated user or null if not authenticated
 */
export async function getUser(): Promise<AuthUser | null> {
  try {
    // Get user from auth service with aggressive caching for stability
    // during server-side rendering and streaming
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

    // Log the error but don't re-throw for auth errors
    if (
      error instanceof Error &&
      (error.message.includes('Refresh Token') ||
        error.message.includes('session') ||
        error.message.includes('auth'))
    ) {
      console.error('Auth error getting current user:', error);
      return null;
    }

    console.error('Error getting current user:', error);
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
