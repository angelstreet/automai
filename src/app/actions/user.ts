'use server';

import { cookies } from 'next/headers';

import { supabaseAuth } from '@/lib/supabase/auth';
import { AuthUser } from '@/types/user';

/**
 * Invalidate user-related cache
 * Clears both client-side storage and server-side cache
 */
export async function invalidateUserCache() {
  // Clear any client-side cache if possible
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user-data-cache');
    localStorage.removeItem('cached_user');
  }

  // Clear the server-side cache
  serverCache.clear();

  return {
    success: true,
    message: 'User cache invalidated',
  };
}

// Server-side cache (unchanged)
const CACHE_TTL = 300000;
const serverCache = new Map<string, { user: AuthUser | null; timestamp: number }>();

export async function getUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('sb-wexkgcszrwxqsthahfyq-auth-token.0');
  if (!authCookie?.value) return null;

  const cacheKey = `user_cache_${authCookie.value.slice(0, 32)}`;
  const cachedEntry = serverCache.get(cacheKey);
  const now = Date.now();

  if (cachedEntry && now - cachedEntry.timestamp < CACHE_TTL) {
    return cachedEntry.user;
  }

  const result = await supabaseAuth.getUser();
  if (!result.success || !result.data) return null;

  const userData = result.data as AuthUser;
  serverCache.set(cacheKey, { user: userData, timestamp: now });
  return userData;
}

// Other functions (updateProfile, setSelectedTeam) remain unchanged

/**
 * Update user profile
 *
 * @param formData Form data or profile data object
 * @returns Result object with success status
 */
export async function updateProfile(formData: FormData | Record<string, any>) {
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

/**
 * Set the user's selected team
 *
 * @param teamId The ID of the team to select
 * @returns Result object with success status
 */
export async function setSelectedTeam(teamId: string) {
  try {
    const user = await getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Verify the team exists and the user has access to it
    if (!user.teams?.some((team) => team.id === teamId)) {
      throw new Error('Team not found or access denied');
    }

    // Store the selected team ID in a cookie
    const cookieStore = await cookies();
    cookieStore.set(`selected_team_${user.id}`, teamId, { maxAge: 60 * 60 * 24 * 365 }); // 1 year

    // Invalidate cache to force refresh of user data
    await invalidateUserCache();

    return {
      success: true,
      message: 'Team selected successfully',
    };
  } catch (error) {
    console.error('Error selecting team:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to select team');
  }
}
