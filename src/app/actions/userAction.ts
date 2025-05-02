'use server';

import { cookies } from 'next/headers';
import { cache } from 'react';

import userDb from '@/lib/db/userDb';
import { createClient } from '@/lib/supabase/server';
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
    const supabase = await createClient(cookieStore);

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error('[@action:user:getUser] Auth error:', authError);
      return null;
    }

    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active_team, avatar_url')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      console.error('[@action:user:getUser] Profile error:', profileError);
      return null;
    }

    // Get user teams
    const { data: teams, error: teamsError } = await supabase
      .from('team_members')
      .select('team_id, teams(id, name, tenant_id, created_at)')
      .eq('user_id', authUser.id);

    const userTeams =
      !teamsError && teams
        ? teams.map((teamMember: any) => ({
            id: teamMember.teams.id,
            name: teamMember.teams.name,
            tenant_id: teamMember.teams.tenant_id,
            created_at: teamMember.teams.created_at,
            is_default: false,
          }))
        : [];

    // Get selected team
    const selectedTeamId = profile.active_team;

    // Construct user object
    return {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Guest',
      role: profile.role,
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

    // Get current user to get ID
    const user = await userDb.getCurrentUser();
    if (!user) {
      throw new Error('User not found');
    }

    // Call the db-users module to handle the update
    return userDb.updateProfile(user.id, metadata);
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update profile');
  }
}
