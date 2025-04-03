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

/**
 * Get available tenant profiles that can be added to a team
 * @param tenantId The tenant ID
 * @param teamId The team ID
 * @param cookieStore Cookie store for authentication
 * @returns Profiles from the tenant that are not already team members
 */
export async function getAvailableTenantProfilesForTeam(
  tenantId: string,
  teamId: string,
  cookieStore?: any,
): Promise<DbResponse<any[]>> {
  try {
    const supabase = await createClient(cookieStore);

    // First get current team members
    const { data: currentMembers, error: membersError } = await supabase
      .from('team_members')
      .select('profile_id')
      .eq('team_id', teamId);

    if (membersError) {
      console.error(
        '[@db:teamMemberDb:getAvailableTenantProfilesForTeam] Error fetching current members:',
        membersError,
      );
      return { success: false, error: membersError.message };
    }

    // Extract profile IDs of current members
    const currentMemberIds = currentMembers ? currentMembers.map((member) => member.profile_id) : [];

    let profiles;
    let profilesError;

    if (currentMemberIds.length > 0) {
      // Get all profiles for the tenant except those already in the team
      const result = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          avatar_url,
          tenant_id,
          role
        `)
        .eq('tenant_id', tenantId)
        .filter('id', 'not.in', `(${currentMemberIds.join(',')})`);
      
      profiles = result.data;
      profilesError = result.error;
    } else {
      // If no members yet, just get all profiles for the tenant
      const result = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          avatar_url,
          tenant_id,
          role
        `)
        .eq('tenant_id', tenantId);
      
      profiles = result.data;
      profilesError = result.error;
    }

    if (profilesError) {
      console.error(
        '[@db:teamMemberDb:getAvailableTenantProfilesForTeam] Error fetching profiles:',
        profilesError,
      );
      return { success: false, error: profilesError.message };
    }

    // Get full user profiles in a single query
    const profileIds = profiles.map((profile) => profile.id);
    
    if (profileIds.length === 0) {
      return { success: true, data: [] };
    }
    
    const { data: userProfiles, error: userProfilesError } = await supabase
      .from('team_user_profiles')
      .select('*')
      .in('id', profileIds);

    if (userProfilesError) {
      console.error(
        '[@db:teamMemberDb:getAvailableTenantProfilesForTeam] Error fetching user profiles:',
        userProfilesError,
      );
    }

    // Enhance profiles with user information
    profiles.forEach((profile) => {
      const userProfile = userProfiles?.find((p) => p.id === profile.id);
      
      // Get avatar with fallbacks, checking metadata if it exists
      let avatarUrl = profile.avatar_url || userProfile?.avatar_url;
      if (!avatarUrl && userProfile?.raw_user_meta_data) {
        // Try to extract avatar from metadata if available
        avatarUrl =
          userProfile.raw_user_meta_data.avatar_url ||
          userProfile.raw_user_meta_data.picture ||
          null;
      }

      profile.user = {
        id: profile.id,
        name: userProfile?.full_name || profile?.email || 'User',
        email: profile.email || 'Email unavailable',
        avatar_url: avatarUrl || null,
      };
    });

    return {
      success: true,
      data: profiles,
    };
  } catch (error: any) {
    console.error(
      '[@db:teamMemberDb:getAvailableTenantProfilesForTeam] Error:',
      error,
    );
    return {
      success: false,
      error: error.message || 'Failed to fetch available tenant profiles',
    };
  }
}

/**
 * Add multiple members to a team
 * @param teamId Team ID
 * @param profileIds Array of profile IDs to add
 * @param role Role to assign to all new members
 * @param cookieStore Cookie store for authentication
 * @returns Success status and count of members added
 */
export async function addMultipleTeamMembers(
  teamId: string,
  profileIds: string[],
  role: string,
  cookieStore?: any,
): Promise<DbResponse<{ count: number }>> {
  try {
    const supabase = await createClient(cookieStore);
    let successCount = 0;
    let errorCount = 0;
    let lastError = '';

    // Process each profile ID
    for (const profileId of profileIds) {
      // Check if the user exists in the profiles table
      const { data: profileExists, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', profileId)
        .single();

      if (profileError || !profileExists) {
        errorCount++;
        lastError = `User with ID ${profileId} does not exist`;
        continue;
      }

      // Check if the member is already in the team
      const { data: existingMember, error: existingError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('profile_id', profileId);

      if (existingError) {
        errorCount++;
        lastError = existingError.message;
        continue;
      }

      if (existingMember && existingMember.length > 0) {
        // Skip if already a member, but don't count as error
        continue;
      }

      // Add the member
      const { error } = await supabase.from('team_members').insert({
        team_id: teamId,
        profile_id: profileId,
        role,
      });

      if (error) {
        errorCount++;
        lastError = error.message;
        continue;
      }

      // Apply role template for permissions
      const { createClient } = await import('@/lib/supabase/server');
      const adminSupabase = await createClient(cookieStore);

      // Call the stored procedure to apply role template
      const { error: roleError } = await adminSupabase.rpc('apply_role_template', {
        p_team_id: teamId,
        p_profile_id: profileId,
        p_role_name: role,
      });

      if (roleError) {
        console.warn(`Failed to apply role template for user ${profileId}:`, roleError);
        // Still count as success since the user was added
      }

      successCount++;
    }

    if (successCount === 0 && errorCount > 0) {
      return {
        success: false,
        error: lastError || 'Failed to add any team members',
      };
    }

    return {
      success: true,
      data: { count: successCount },
    };
  } catch (error: any) {
    console.error('[@db:teamMemberDb:addMultipleTeamMembers] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to add team members',
    };
  }
}

// Export at the end of the file
export default {
  getTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  getAvailableTenantProfilesForTeam,
  addMultipleTeamMembers,
};