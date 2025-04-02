import { createClient } from '@/lib/supabase/server';
import { DbResponse } from '@/lib/utils/commonUtils';
import type { TeamMember, TeamMemberCreateInput } from '@/types/context/teamContextType';

/**
 * Get team members for a specific team
 * @param teamId Team ID
 * @param cookieStore Cookie store from server action
 * @returns Team members with their profile data
 */
export async function getTeamMembers(
  teamId: string,
  cookieStore?: any,
): Promise<DbResponse<TeamMember[]>> {
  try {
    const supabase = await createClient(cookieStore);

    // Get team members with basic profile data
    const { data, error } = await supabase
      .from('team_members')
      .select(
        `
        team_id,
        profile_id,
        role,
        created_at,
        updated_at,
        profiles:profiles(id, tenant_id, tenant_name, role)
      `,
      )
      .eq('team_id', teamId);

    if (error) {
      console.error('[@db:teamMemberDb:getTeamMembers] Error fetching team members:', error);
      return { success: false, error: error.message };
    }

    // For each team member, fetch their user profile from our view
    if (data && data.length > 0) {
      // Get all user IDs for batch fetching
      const profileIds = data.map((member) => member.profile_id);

      // Fetch user profiles in a single query
      const { data: userProfiles, error: profilesError } = await supabase
        .from('team_user_profiles')
        .select('*')
        .in('id', profileIds);

      if (profilesError) {
        console.error(
          '[@db:teamMemberDb:getTeamMembers] Error fetching user profiles:',
          profilesError,
        );
      }

      // Map user profiles to team members
      data.forEach((member) => {
        const profile = member.profiles as any;
        const userProfile = userProfiles?.find((p) => p.id === member.profile_id);

        // Get avatar with fallbacks, checking metadata if it exists
        let avatarUrl = userProfile?.avatar_url;
        if (!avatarUrl && userProfile?.raw_user_meta_data) {
          // Try to extract avatar from metadata if available
          avatarUrl =
            userProfile.raw_user_meta_data.avatar_url ||
            userProfile.raw_user_meta_data.picture ||
            null;
        }

        member.user = {
          id: member.profile_id,
          name: userProfile?.full_name || profile?.tenant_name || 'User',
          email: userProfile?.email || 'Email unavailable',
          avatar_url: avatarUrl || null,
        };
      });
    }

    //console.log('[@db:teamMemberDb:getTeamMembers] Team members with user info:', data);

    // Cast to TeamMember[] with unknown intermediate to satisfy TypeScript
    return {
      success: true,
      data: data as unknown as TeamMember[],
    };
  } catch (error: any) {
    console.error('[@db:teamMemberDb:getTeamMembers] Error in getTeamMembers:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch team members',
    };
  }
}

/**
 * Add a member to a team
 * @param input Team member data to create
 * @param cookieStore Cookie store for authentication
 * @returns Created team member data
 */
export async function addTeamMember(
  input: TeamMemberCreateInput,
  cookieStore?: any,
): Promise<DbResponse<TeamMember>> {
  try {
    const supabase = await createClient(cookieStore);

    // Check if the user exists in the profiles table
    const { data: profileExists, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', input.profile_id)
      .single();

    if (profileError || !profileExists) {
      return {
        success: false,
        error: 'User does not exist',
      };
    }

    // Check if the member is already in the team
    const { data: existingMember, error: existingError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', input.team_id)
      .eq('profile_id', input.profile_id);

    if (existingError) {
      return { success: false, error: existingError.message };
    }

    if (existingMember && existingMember.length > 0) {
      return {
        success: false,
        error: 'User is already a member of this team',
      };
    }

    // Add the member
    const { data, error } = await supabase
      .from('team_members')
      .insert(input)
      .select(
        `
        team_id,
        profile_id,
        role,
        created_at,
        updated_at,
        profiles:profile_id (id, email, avatar_url)
      `,
      )
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as unknown as TeamMember,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to add team member',
    };
  }
}

/**
 * Update a team member's role
 * @param teamId Team ID
 * @param profileId Profile ID of the team member
 * @param role New role for the team member
 * @param cookieStore Cookie store for authentication
 * @returns Updated team member data
 */
export async function updateTeamMemberRole(
  teamId: string,
  profileId: string,
  role: string,
  cookieStore?: any,
): Promise<DbResponse<TeamMember>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('team_members')
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('team_id', teamId)
      .eq('profile_id', profileId)
      .select(
        `
        team_id,
        profile_id,
        role,
        created_at,
        updated_at,
        profiles:profile_id (id, email, avatar_url)
      `,
      )
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as unknown as TeamMember,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update team member role',
    };
  }
}

/**
 * Remove a member from a team
 * @param teamId Team ID
 * @param profileId Profile ID of the team member to remove
 * @param cookieStore Cookie store for authentication
 * @returns Success status
 */
export async function removeTeamMember(
  teamId: string,
  profileId: string,
  cookieStore?: any,
): Promise<DbResponse<null>> {
  try {
    const supabase = await createClient(cookieStore);

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('profile_id', profileId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to remove team member',
    };
  }
}

// Export at the end of the file
export default {
  getTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
};
