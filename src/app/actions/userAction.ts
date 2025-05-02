'use server';

import { cache } from 'react';

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
    const authUserResult = await userDb.getCurrentUser();
    if (!authUserResult.success || !authUserResult.data) {
      console.error('[@action:user:getUser] Auth error: User not found');
      return null;
    }

    const authUser = authUserResult.data;

    // Get profile data
    const profileResult = await userDb.findUnique({ where: { id: authUser.id } });
    if (!profileResult || !profileResult.data) {
      console.error('[@action:user:getUser] Profile error:', profileResult?.error);
      return null;
    }

    const profile = profileResult.data;

    // Get user teams
    const teamsResult = await teamMemberDb.getTeamMembers(authUser.id);
    const userTeams =
      teamsResult.success && teamsResult.data
        ? teamsResult.data.map((teamMember: any) => ({
            id: teamMember.team.id,
            name: teamMember.team.name,
            tenant_id: teamMember.team.tenant_id,
            created_at: teamMember.team.created_at,
            is_default: false,
          }))
        : [];

    // Get selected team
    const selectedTeamId = profile.active_team;

    // Get role from team_members for active team
    let role: string | null = null;
    if (selectedTeamId) {
      const roleResult = await teamMemberDb.getTeamMemberRole(authUser.id, selectedTeamId);
      if (!roleResult.success) {
        console.error(
          '[@action:user:getUser] Error fetching role from team_members:',
          roleResult.error,
        );
      }
      role = roleResult.data ? roleResult.data : null;
    }

    // Construct user object with role (may be null)
    return {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Guest',
      role: role as any, // casting to Role type
      tenant_id: profile.tenant_id,
      avatar_url: authUser.user_metadata?.avatar_url || profile.avatar_url || '',
      user_metadata: authUser.user_metadata,
      teams: userTeams,
      selectedTeamId,
      teamMembers: [],
    };
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

    const userResult = await userDb.getCurrentUser();
    if (!userResult.success || !userResult.data) {
      throw new Error('User not found');
    }

    // Call the db-users module to handle the update
    return userDb.updateProfile(userResult.data.id, metadata);
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update profile');
  }
}
