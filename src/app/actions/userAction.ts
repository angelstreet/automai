'use server';

import { cache } from 'react';
import { cookies } from 'next/headers';

import teamMemberDb from '@/lib/db/teamMemberDb';
import userDb from '@/lib/db/userDb';
import cacheUtils from '@/lib/utils/cacheUtils';
import type { User } from '@/types/service/userServiceType';

/**
 * Invalidate user-related cache
 * Clears both client-side storage and server-side cache
 */
export async function invalidateUserCache() {
  // Clear the cache using the cacheUtils
  cacheUtils.clearCache();

  return {
    success: true,
    message: 'User cache invalidated',
  };
}

/**
 * Get the current authenticated user with proper caching
 * Returns the user data directly without needing mapping
 */
export const getUser = cache(async (): Promise<User | null> => {
  try {
    const cookieStore = await cookies();
    const userDataCookie = cookieStore.get('user-data');

    if (userDataCookie) {
      const userData = JSON.parse(userDataCookie.value);
      console.log('[@action:user:getUser] User data retrieved from cookie');
      return userData as User;
    }

    // No fallback to Supabase; rely on middleware to set cookie
    console.log('[@action:user:getUser] No user data in cookie, user not authenticated');
    return null;
  } catch (error) {
    console.error('[@action:user:getUser] Error:', error);
    return null;
  }
});

/**
 * Update user profile
 *
 * @param formData Form data or profile data object
 * @returns Result object with success status
 */
export async function updateProfile(formData: FormData | Record<string, any>) {
  try {
    // Extract data from FormData or direct object
    const metadata: Record<string, any> = {};

    if (formData instanceof FormData) {
      const name = formData.get('name') as string;
      const locale = (formData.get('locale') as string) || 'en';
      const avatar_url = formData.get('avatar_url') as string;
      const role = formData.get('role') as string;

      if (name) metadata.name = name;
      if (locale) metadata.locale = locale;
      if (avatar_url) metadata.avatar_url = avatar_url;
      if (role) metadata.role = role;
    } else {
      // Direct object
      if (formData.name) metadata.name = formData.name;
      if (formData.locale) metadata.locale = formData.locale || 'en';
      if (formData.avatar_url) metadata.avatar_url = formData.avatar_url;
      if (formData.role) metadata.role = formData.role;
    }

    // Get user ID from cookie instead of Supabase call
    const cookieStore = await cookies();
    const userDataCookie = cookieStore.get('user-data');
    if (!userDataCookie) {
      throw new Error('User not authenticated');
    }
    const userData = JSON.parse(userDataCookie.value);
    const userId = userData.id;

    if (!userId) {
      throw new Error('User ID not found in cookie');
    }

    // Call the db-users module to handle the update
    return userDb.updateProfile(userId, metadata);
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update profile');
  }
}
