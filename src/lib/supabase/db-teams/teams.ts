import { PostgrestError } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

export interface Team {
  id: string;
  name: string;
  tenant_id: string;
  subscription_tier: string;
  organization_id?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  profile_id: string;
  role: 'admin' | 'member';
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export type CreateTeamPayload = Pick<Team, 'name' | 'tenant_id'>;
export type UpdateTeamPayload = Partial<
  Pick<Team, 'name' | 'subscription_tier' | 'is_default' | 'organization_id'>
>;

export type TeamResult = {
  success: boolean;
  data?: Team;
  error?: string;
};

export type TeamsResult = {
  success: boolean;
  data?: Team[];
  error?: string;
};

export type TeamMemberResult = {
  success: boolean;
  data?: TeamMember;
  error?: string;
};

export type TeamMembersResult = {
  success: boolean;
  data?: TeamMember[];
  error?: string;
};

/**
 * Helper function to create a plain serializable team object
 * This ensures we only return primitive types that can be safely serialized
 */
function createSerializableTeam(rawTeam: any): Team {
  // Log the input object
  console.log(`[@db:teams:createSerializableTeam] Input object type:`, typeof rawTeam);
  console.log(
    `[@db:teams:createSerializableTeam] Input constructor:`,
    rawTeam?.constructor?.name || 'unknown',
  );
  console.log(
    `[@db:teams:createSerializableTeam] Input prototype:`,
    Object.getPrototypeOf(rawTeam)?.constructor?.name || 'unknown',
  );
  console.log(`[@db:teams:createSerializableTeam] Input keys:`, Object.keys(rawTeam || {}));

  // Log any suspicious properties that might cause serialization issues
  for (const key in rawTeam) {
    const value = rawTeam[key];
    if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
      console.log(
        `[@db:teams:createSerializableTeam] Complex property "${key}" type:`,
        typeof value,
      );
      console.log(
        `[@db:teams:createSerializableTeam] Complex property "${key}" constructor:`,
        value?.constructor?.name || 'unknown',
      );
    }
  }

  const serialized = {
    id: rawTeam?.id || '',
    name: rawTeam?.name || '',
    tenant_id: rawTeam?.tenant_id || '',
    subscription_tier: rawTeam?.subscription_tier || '',
    organization_id: rawTeam?.organization_id || null,
    is_default: Boolean(rawTeam?.is_default),
    created_at: rawTeam?.created_at || '',
    updated_at: rawTeam?.updated_at || '',
  };

  // Log the output object
  console.log(`[@db:teams:createSerializableTeam] Output object:`, serialized);
  console.log(
    `[@db:teams:createSerializableTeam] JSON test:`,
    JSON.stringify(serialized) ? 'serializable' : 'not serializable',
  );

  return serialized;
}

/**
 * Create a new team
 */
export async function createTeam(
  payload: CreateTeamPayload,
  cookieStore?: any,
): Promise<TeamResult> {
  try {
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: payload.name,
        tenant_id: payload.tenant_id,
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('[@db:teams:createTeam] Error creating team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to create team',
    };
  }
}

/**
 * Get all teams for a tenant
 */
export async function getTeams(tenantId: string, cookieStore?: any): Promise<TeamsResult> {
  try {
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // If no data, return early
    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Create an array of plain serializable objects using our helper
    const plainTeams = data.map((rawTeam) => createSerializableTeam(rawTeam));

    console.log(
      `[@db:teams:getTeams] Constructed ${plainTeams.length} serializable team objects for tenant: ${tenantId}`,
    );

    return {
      success: true,
      data: plainTeams,
    };
  } catch (error) {
    console.error('[@db:teams:getTeams] Error fetching teams:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to fetch teams',
    };
  }
}

/**
 * Get teams that a user belongs to
 */
export async function getUserTeams(
  profileId: string,
  cookieStore?: any,
): Promise<{ success: boolean; data?: Team[]; error?: string }> {
  try {
    // Get user's teams (both owned and as a member)
    const supabase = await createClient(cookieStore);
    console.log(`[@db:teams:getUserTeams] Fetching teams for user: ${profileId}`);

    const { data, error } = await supabase
      .from('teams')
      .select('*, team_members!inner(profile_id)')
      .eq('team_members.profile_id', profileId);

    if (error) throw error;

    // If no data, return early
    if (!data || data.length === 0) {
      console.log(`[@db:teams:getUserTeams] No teams found for user: ${profileId}`);
      return {
        success: true,
        data: [],
      };
    }

    // Log the raw data from Supabase
    console.log(`[@db:teams:getUserTeams] Raw data from Supabase, length:`, data.length);
    if (data.length > 0) {
      const firstTeam = data[0];
      console.log(`[@db:teams:getUserTeams] First team type:`, typeof firstTeam);
      console.log(
        `[@db:teams:getUserTeams] First team constructor:`,
        firstTeam?.constructor?.name || 'unknown',
      );
      console.log(
        `[@db:teams:getUserTeams] First team prototype:`,
        Object.getPrototypeOf(firstTeam)?.constructor?.name || 'unknown',
      );
      console.log(`[@db:teams:getUserTeams] First team keys:`, Object.keys(firstTeam || {}));

      // Check serialization of raw data
      try {
        const jsonTest = JSON.stringify(firstTeam);
        console.log(
          `[@db:teams:getUserTeams] Direct JSON test on first team: Success, length:`,
          jsonTest.length,
        );
      } catch (err) {
        console.error(`[@db:teams:getUserTeams] Direct JSON test on first team failed:`, err);
      }
    }

    // Create an array of plain serializable objects using our helper
    const plainTeams = data.map((rawTeam) => createSerializableTeam(rawTeam));

    // Test serialization of processed data
    if (plainTeams.length > 0) {
      try {
        const jsonTest = JSON.stringify(plainTeams[0]);
        console.log(
          `[@db:teams:getUserTeams] Helper JSON test on first team: Success, length:`,
          jsonTest.length,
        );
      } catch (err) {
        console.error(`[@db:teams:getUserTeams] Helper JSON test on first team failed:`, err);
      }
    }

    console.log(
      `[@db:teams:getUserTeams] Constructed ${plainTeams.length} serializable team objects for user: ${profileId}`,
    );

    return {
      success: true,
      data: plainTeams,
    };
  } catch (error) {
    console.error('[@db:teams:getUserTeams] Error fetching user teams:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user teams',
    };
  }
}

/**
 * Get a team by ID
 */
export async function getTeamById(teamId: string, cookieStore?: any): Promise<TeamResult> {
  try {
    const supabase = await createClient(cookieStore);
    console.log(`[@db:teams:getTeamById] Fetching team with ID: ${teamId}`);

    const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single();

    if (error) throw error;

    // Log the raw data from Supabase
    console.log(`[@db:teams:getTeamById] Raw data from Supabase type:`, typeof data);
    console.log(
      `[@db:teams:getTeamById] Raw data constructor:`,
      data?.constructor?.name || 'unknown',
    );
    console.log(
      `[@db:teams:getTeamById] Raw data prototype:`,
      Object.getPrototypeOf(data)?.constructor?.name || 'unknown',
    );
    console.log(`[@db:teams:getTeamById] Raw data keys:`, Object.keys(data || {}));

    // Check serialization of raw data
    try {
      const jsonTest = JSON.stringify(data);
      console.log(`[@db:teams:getTeamById] Direct JSON test: Success, length:`, jsonTest.length);
    } catch (err) {
      console.error(`[@db:teams:getTeamById] Direct JSON test failed:`, err);
    }

    // Create a plain serializable object using our helper
    const plainTeam = createSerializableTeam(data);

    // Test serialization of processed data
    try {
      const jsonTest = JSON.stringify(plainTeam);
      console.log(`[@db:teams:getTeamById] Helper JSON test: Success, length:`, jsonTest.length);
    } catch (err) {
      console.error(`[@db:teams:getTeamById] Helper JSON test failed:`, err);
    }

    console.log(`[@db:teams:getTeamById] Constructed serializable team object for id: ${teamId}`);

    return {
      success: true,
      data: plainTeam,
    };
  } catch (error) {
    console.error('[@db:teams:getTeamById] Error fetching team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to fetch team',
    };
  }
}

/**
 * Update a team
 */
export async function updateTeam(
  teamId: string,
  payload: UpdateTeamPayload,
  cookieStore?: any,
): Promise<TeamResult> {
  try {
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase
      .from('teams')
      .update(payload)
      .eq('id', teamId)
      .select('*')
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('[@db:teams:updateTeam] Error updating team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to update team',
    };
  }
}

/**
 * Delete a team
 */
export async function deleteTeam(
  teamId: string,
  cookieStore?: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(cookieStore);
    const { error } = await supabase.from('teams').delete().eq('id', teamId);

    if (error) throw error;

    return {
      success: true,
    };
  } catch (error) {
    console.error('[@db:teams:deleteTeam] Error deleting team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to delete team',
    };
  }
}

/**
 * Get members of a team
 */
export async function getTeamMembers(
  teamId: string,
  cookieStore?: any,
): Promise<TeamMembersResult> {
  try {
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase
      .from('team_members')
      .select('*, profile:profiles(id, full_name, email, avatar_url)')
      .eq('team_id', teamId);

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('[@db:teams:getTeamMembers] Error fetching team members:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to fetch team members',
    };
  }
}

/**
 * Add a member to a team
 */
export async function addTeamMember(
  teamId: string,
  profileId: string,
  role: 'admin' | 'member' = 'member',
  cookieStore?: any,
): Promise<TeamMemberResult> {
  try {
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        profile_id: profileId,
        role,
      })
      .select('*, profile:profiles(id, full_name, email, avatar_url)')
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('[@db:teams:addTeamMember] Error adding team member:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to add team member',
    };
  }
}

/**
 * Update a team member's role
 */
export async function updateTeamMember(
  teamId: string,
  profileId: string,
  role: 'admin' | 'member',
  cookieStore?: any,
): Promise<TeamMemberResult> {
  try {
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('profile_id', profileId)
      .select('*, profile:profiles(id, full_name, email, avatar_url)')
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('[@db:teams:updateTeamMember] Error updating team member:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to update team member',
    };
  }
}

/**
 * Remove a member from a team
 */
export async function removeTeamMember(
  teamId: string,
  profileId: string,
  cookieStore?: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(cookieStore);
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('profile_id', profileId);

    if (error) throw error;

    return {
      success: true,
    };
  } catch (error) {
    console.error('[@db:teams:removeTeamMember] Error removing team member:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to remove team member',
    };
  }
}

/**
 * Get the active team for a user
 */
export async function getUserActiveTeam(userId: string, cookieStore?: any): Promise<TeamResult> {
  try {
    console.log(`[@db:teams:getUserActiveTeam] Getting active team for user: ${userId}`);

    // Since the stored procedure doesn't exist, use a direct query to get the user's teams
    const result = await getUserTeams(userId, cookieStore);

    console.log(`[@db:teams:getUserActiveTeam] Result from getUserTeams type:`, typeof result);
    console.log(`[@db:teams:getUserActiveTeam] Success:`, result.success);

    if (result.success && result.data && result.data.length > 0) {
      // Extract the first team
      const rawTeam = result.data[0];

      console.log(`[@db:teams:getUserActiveTeam] Raw team object type:`, typeof rawTeam);
      console.log(
        `[@db:teams:getUserActiveTeam] Raw team object constructor:`,
        rawTeam?.constructor?.name || 'unknown',
      );

      // Try direct JSON serialization first to see if it works without our helper
      try {
        const jsonTest = JSON.stringify(rawTeam);
        console.log(
          `[@db:teams:getUserActiveTeam] Direct JSON test: Success, length:`,
          jsonTest.length,
        );
      } catch (err) {
        console.error(`[@db:teams:getUserActiveTeam] Direct JSON test failed:`, err);
      }

      // Create a plain serializable object using our helper
      const plainTeam = createSerializableTeam(rawTeam);

      // Try JSON serialization again after our helper
      try {
        const jsonTest = JSON.stringify(plainTeam);
        console.log(
          `[@db:teams:getUserActiveTeam] Helper JSON test: Success, length:`,
          jsonTest.length,
        );
      } catch (err) {
        console.error(`[@db:teams:getUserActiveTeam] Helper JSON test failed:`, err);
      }

      console.log(
        `[@db:teams:getUserActiveTeam] Constructed serializable team object for user: ${userId}`,
      );

      // Return the plain object
      return {
        success: true,
        data: plainTeam,
      };
    }

    console.error(`[@db:teams:getUserActiveTeam] No teams found for user: ${userId}`);
    return {
      success: false,
      error: 'No teams found for user',
    };
  } catch (error) {
    console.error(`[@db:teams:getUserActiveTeam] Error fetching user active team:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user active team',
    };
  }
}

/**
 * Set the active team for a user
 * Note: This is a simplified implementation since the stored procedure doesn't exist
 */
export async function setUserActiveTeam(
  userId: string,
  teamId: string,
  cookieStore?: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[@db:teams:setUserActiveTeam] Setting active team: ${teamId} for user: ${userId}`);

    // First check if the team exists and the user is a member
    const teamResult = await getTeamById(teamId, cookieStore);
    if (!teamResult.success || !teamResult.data) {
      console.error(`[@db:teams:setUserActiveTeam] Team not found: ${teamId}`);
      return { success: false, error: 'Team not found' };
    }

    // Check if the user is a member of this team
    const teamsResult = await getUserTeams(userId);
    if (!teamsResult.success || !teamsResult.data) {
      console.error(`[@db:teams:setUserActiveTeam] Failed to get user teams: ${userId}`);
      return { success: false, error: 'Failed to get user teams' };
    }

    const isMember = teamsResult.data.some((team) => team.id === teamId);
    if (!isMember) {
      console.error(`[@db:teams:setUserActiveTeam] User is not a member of team: ${teamId}`);
      return { success: false, error: 'User is not a member of this team' };
    }

    // In a real implementation, we would save the active team ID to the database
    // For now, we'll just return success since we're handling this in memory via context
    console.log(
      `[@db:teams:setUserActiveTeam] Successfully set active team: ${teamId} for user: ${userId}`,
    );
    return { success: true };
  } catch (error) {
    console.error(`[@db:teams:setUserActiveTeam] Error setting user active team:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set user active team',
    };
  }
}
