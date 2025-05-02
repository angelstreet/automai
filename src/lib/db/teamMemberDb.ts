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
        profiles:profiles(id, active_team),
        teams:team_id(id, name)
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
        // Cast member to TeamMemberDetails to allow for adding properties
        const memberDetails = member as unknown as {
          team_id: string;
          profile_id: string;
          role: string;
          created_at: string;
          updated_at: string;
          profiles: any;
          teams: any;
          team_name?: string;
          user?: {
            id: string;
            name?: string;
            email?: string;
            avatar_url?: string | null;
          };
        };

        const team = memberDetails.teams as any;
        const userProfile = userProfiles?.find((p) => p.id === memberDetails.profile_id);

        // Add team name to member
        memberDetails.team_name = team?.name || 'Unknown Team';

        // Get avatar with fallbacks, checking metadata if it exists
        let avatarUrl = userProfile?.avatar_url;
        if (!avatarUrl && userProfile?.raw_user_meta_data) {
          // Try to extract avatar from metadata if available
          avatarUrl =
            userProfile.raw_user_meta_data.avatar_url ||
            userProfile.raw_user_meta_data.picture ||
            null;
        }

        // Get name from raw_user_meta_data.name instead of full_name
        let name = 'User';
        if (userProfile?.raw_user_meta_data) {
          name = userProfile.raw_user_meta_data.name || 'User';
        }

        memberDetails.user = {
          id: memberDetails.profile_id,
          name: name,
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
 * @param _tenantId The tenant ID (currently unused)
 * @param teamId The team ID
 * @param cookieStore Cookie store for authentication
 * @returns Profiles from the tenant that are not already team members
 */
export async function getAvailableTenantProfilesForTeam(
  _tenantId: string,
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
    const currentMemberIds = currentMembers
      ? currentMembers.map((member) => member.profile_id)
      : [];

    // Step 1: Get profiles from the profiles table
    let profilesQuery = supabase
      .from('profiles')
      .select(
        `
        id, 
        avatar_url,
        active_team,
        role
      `,
      )
      .eq('active_team', teamId);

    // Filter out existing team members if any
    if (currentMemberIds.length > 0) {
      profilesQuery = profilesQuery.not('id', 'in', `(${currentMemberIds.join(',')})`);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error(
        '[@db:teamMemberDb:getAvailableTenantProfilesForTeam] Error fetching profiles:',
        profilesError,
      );
      return { success: false, error: profilesError.message };
    }

    if (!profiles || profiles.length === 0) {
      return { success: true, data: [] };
    }

    // Step 2: Get emails for these profiles from auth.users using the admin API
    // We can't directly access auth.users from RLS policies, so we need to use a server function
    // or use the team_user_profiles view if it contains email data

    // Get full user profiles in a single query
    const profileIds = profiles.map((profile) => profile.id);

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

    // Step 3: Combine the data from both sources
    const enhancedProfiles = profiles.map((profile) => {
      const userProfile = userProfiles?.find((p) => p.id === profile.id) || {};

      // Get avatar with fallbacks, checking metadata if it exists
      let avatarUrl = profile.avatar_url || userProfile?.avatar_url;
      if (!avatarUrl && userProfile?.raw_user_meta_data) {
        // Try to extract avatar from metadata if available
        avatarUrl =
          userProfile.raw_user_meta_data.avatar_url ||
          userProfile.raw_user_meta_data.picture ||
          null;
      }

      return {
        ...profile,
        email: userProfile?.email || null,
        user: {
          id: profile.id,
          name: userProfile?.raw_user_meta_data?.name || 'User',
          email: userProfile?.email || 'Email unavailable',
          avatar_url: avatarUrl || null,
        },
      };
    });

    return {
      success: true,
      data: enhancedProfiles,
    };
  } catch (error: any) {
    console.error('[@db:teamMemberDb:getAvailableTenantProfilesForTeam] Error:', error);
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

/**
 * Get a team member's role based on their profile ID and active team
 * @param profileId The user's profile ID
 * @param teamId The team ID (typically the user's active team)
 * @param cookieStore Cookie store for authentication
 * @returns The user's role in the specified team or null if not found
 */
export async function getTeamMemberRole(
  profileId: string,
  teamId: string,
  cookieStore?: any,
): Promise<DbResponse<string | null>> {
  try {
    console.log(
      `[@db:teamMemberDb:getTeamMemberRole] Getting role for profile: ${profileId}, team: ${teamId}`,
    );

    if (!profileId || !teamId) {
      console.error(
        `[@db:teamMemberDb:getTeamMemberRole] Missing required parameters: profileId=${profileId}, teamId=${teamId}`,
      );
      return { success: false, error: 'Missing required parameters' };
    }

    const supabase = await createClient(cookieStore);
    console.log(`[@db:teamMemberDb:getTeamMemberRole] Supabase client created, fetching role`);

    // Log raw query parameters for debugging
    console.log(`[@db:teamMemberDb:getTeamMemberRole] Query parameters:`, {
      table: 'team_members',
      profileIdType: typeof profileId,
      profileIdValue: profileId,
      teamIdType: typeof teamId,
      teamIdValue: teamId,
    });

    // Get the team member record for this user and team
    const start = Date.now();
    const { data, error } = await supabase
      .from('team_members')
      .select('role')
      .eq('profile_id', profileId)
      .eq('team_id', teamId)
      .single();
    const duration = Date.now() - start;

    console.log(`[@db:teamMemberDb:getTeamMemberRole] Query completed in ${duration}ms`);

    // Log the raw query result for debugging
    console.log(`[@db:teamMemberDb:getTeamMemberRole] Raw query result:`, {
      hasData: !!data,
      dataType: data ? typeof data : 'null',
      data: data,
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
    });

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user is not a member of this team
        console.log(
          `[@db:teamMemberDb:getTeamMemberRole] No team membership found for profile: ${profileId} in team: ${teamId} (query time: ${duration}ms)`,
        );

        // Try a fallback query without .single() to see if we get any rows at all
        console.log(`[@db:teamMemberDb:getTeamMemberRole] Trying fallback query without .single()`);
        const fallbackStart = Date.now();
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('team_members')
          .select('role')
          .eq('profile_id', profileId)
          .eq('team_id', teamId);
        const fallbackDuration = Date.now() - fallbackStart;

        console.log(`[@db:teamMemberDb:getTeamMemberRole] Fallback query results:`, {
          duration: fallbackDuration,
          hasData: !!fallbackData,
          dataLength: fallbackData?.length,
          data: fallbackData,
          hasError: !!fallbackError,
        });

        return { success: true, data: null };
      }

      console.error(`[@db:teamMemberDb:getTeamMemberRole] Error fetching role:`, error);
      console.error(`[@db:teamMemberDb:getTeamMemberRole] Query parameters:`, {
        profileId,
        teamId,
      });
      return { success: false, error: error.message };
    }

    if (!data) {
      console.warn(
        `[@db:teamMemberDb:getTeamMemberRole] Query returned no data but no error for profile: ${profileId} in team: ${teamId}`,
      );
      return { success: true, data: null };
    }

    console.log(
      `[@db:teamMemberDb:getTeamMemberRole] Found role: ${data.role} for profile: ${profileId} in team: ${teamId} (query time: ${duration}ms)`,
    );

    // Log additional details about the role value
    console.log(`[@db:teamMemberDb:getTeamMemberRole] Role details:`, {
      roleType: typeof data.role,
      roleValue: data.role,
      roleIsEmpty: data.role === '',
      roleIsNull: data.role === null,
      roleIsUndefined: data.role === undefined,
    });

    return { success: true, data: data.role };
  } catch (error: any) {
    console.error(`[@db:teamMemberDb:getTeamMemberRole] Error:`, error);
    console.error(`[@db:teamMemberDb:getTeamMemberRole] Query parameters:`, { profileId, teamId });
    return { success: false, error: error.message || 'Failed to get team member role' };
  }
}

/**
 * Get all teams that a user is a member of
 * @param userId User ID
 * @param cookieStore Cookie store from server action
 * @returns Teams the user is a member of
 */
export async function getTeamsByUserId(
  userId: string,
  cookieStore?: any,
): Promise<DbResponse<any[]>> {
  try {
    console.log(`[@db:teamMemberDb:getTeamsByUserId] Getting teams for user: ${userId}`);
    const supabase = await createClient(cookieStore);

    // Get team memberships with team data
    const { data, error } = await supabase
      .from('team_members')
      .select('team_id, teams:teams(id, name, tenant_id, created_at)')
      .eq('profile_id', userId);

    if (error) {
      console.error('[@db:teamMemberDb:getTeamsByUserId] Error fetching teams:', error);
      return { success: false, error: error.message };
    }

    // Transform data to the expected format
    const teams = data.map((membership: any) => ({
      id: membership.teams.id,
      name: membership.teams.name,
      tenant_id: membership.teams.tenant_id,
      created_at: membership.teams.created_at,
      is_default: false,
    }));

    console.log(
      `[@db:teamMemberDb:getTeamsByUserId] Found ${teams.length} teams for user ${userId}`,
    );
    return { success: true, data: teams };
  } catch (error: any) {
    console.error('[@db:teamMemberDb:getTeamsByUserId] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch teams for user',
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
  getTeamMemberRole,
  getTeamsByUserId,
};
