'use server';

import userDB from '@/lib/supabase/db-users';
import { AuthUser } from '@/types/user';

/**
 * Invalidate user-related cache
 * Clears both client-side storage and server-side cache
 */
export async function invalidateUserCache() {
  // Forward to the DB module to clear its cache
  await userDB.clearCache();

  return {
    success: true,
    message: 'User cache invalidated',
  };
}

/**
 * Get the current authenticated user
 * @returns User data or null if not authenticated
 */
export async function getUser(): Promise<AuthUser | null> {
  return userDB.getCurrentUser();
}

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

    // Get current user to get ID
    const user = await userDB.getCurrentUser();
    if (!user) {
      throw new Error('User not found');
    }

    // Call the db-users module to handle the update
    return userDB.updateProfile(user.id, metadata);
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
  console.warn(
    '[@action:user:setSelectedTeam] DEPRECATED: Use setSelectedTeam from team actions instead',
  );

  // Import the new function from team actions to avoid circular dependencies
  const { setSelectedTeam: teamSetSelectedTeam } = await import('@/app/actions/team');

  // Call the new function
  return teamSetSelectedTeam(teamId);
}
