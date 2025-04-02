import { PostgrestError } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';
import { type DbResponse } from '@/lib/utils/dbUtils';

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

export type CreateTeamPayload = Pick<Team, 'name' | 'tenant_id'>;
export type UpdateTeamPayload = Partial<
  Pick<Team, 'name' | 'subscription_tier' | 'is_default' | 'organization_id'>
>;

/**
 * Helper function to create a plain serializable team object
 */
function createSerializableTeam(rawTeam: any): Team {
  return {
    id: rawTeam?.id || '',
    name: rawTeam?.name || '',
    tenant_id: rawTeam?.tenant_id || '',
    subscription_tier: rawTeam?.subscription_tier || '',
    organization_id: rawTeam?.organization_id || null,
    is_default: Boolean(rawTeam?.is_default),
    created_at: rawTeam?.created_at || '',
    updated_at: rawTeam?.updated_at || '',
  };
}

/**
 * Create a new team
 */
export async function createTeam(
  payload: CreateTeamPayload,
  cookieStore?: any,
): Promise<DbResponse<Team>> {
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
    console.error('[@db:teamDb:createTeam] Error creating team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to create team',
    };
  }
}

/**
 * Get all teams for a tenant
 */
export async function getTeams(tenantId: string, cookieStore?: any): Promise<DbResponse<Team[]>> {
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

    // Create an array of plain serializable objects
    const plainTeams = data.map((rawTeam) => createSerializableTeam(rawTeam));

    console.log(
      `[@db:teamDb:getTeams] Retrieved ${plainTeams.length} teams for tenant: ${tenantId}`,
    );

    return {
      success: true,
      data: plainTeams,
    };
  } catch (error) {
    console.error('[@db:teamDb:getTeams] Error fetching teams:', error);
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
): Promise<DbResponse<Team[]>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('teams')
      .select('*, team_members!inner(profile_id)')
      .eq('team_members.profile_id', profileId);

    if (error) throw error;

    // If no data, return early
    if (!data || data.length === 0) {
      console.log(`[@db:teamDb:getUserTeams] No teams found for user: ${profileId}`);
      return {
        success: true,
        data: [],
      };
    }

    // Create an array of plain serializable objects
    const plainTeams = data.map((rawTeam) => createSerializableTeam(rawTeam));

    console.log(
      `[@db:teamDb:getUserTeams] Retrieved ${plainTeams.length} teams for user: ${profileId}`,
    );

    return {
      success: true,
      data: plainTeams,
    };
  } catch (error) {
    console.error('[@db:teamDb:getUserTeams] Error fetching user teams:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user teams',
    };
  }
}

/**
 * Get a team by ID
 */
export async function getTeamById(teamId: string, cookieStore?: any): Promise<DbResponse<Team>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single();

    if (error) throw error;

    // Create a plain serializable object
    const plainTeam = createSerializableTeam(data);

    console.log(`[@db:teamDb:getTeamById] Retrieved team for id: ${teamId}`);

    return {
      success: true,
      data: plainTeam,
    };
  } catch (error) {
    console.error('[@db:teamDb:getTeamById] Error fetching team:', error);
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
): Promise<DbResponse<Team>> {
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
    console.error('[@db:teamDb:updateTeam] Error updating team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to update team',
    };
  }
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: string, cookieStore?: any): Promise<DbResponse<null>> {
  try {
    const supabase = await createClient(cookieStore);
    const { error } = await supabase.from('teams').delete().eq('id', teamId);

    if (error) throw error;

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error('[@db:teamDb:deleteTeam] Error deleting team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to delete team',
    };
  }
}

/**
 * Get the active team for a user
 * @param userId The user ID
 * @param cookieStore The cookie store for creating the Supabase client
 * @param teams Optional pre-fetched teams to avoid duplicate database calls
 */
export async function getUserActiveTeam(
  userId: string,
  cookieStore?: any,
  teams?: Team[],
): Promise<DbResponse<Team>> {
  try {
    let userTeams: Team[] = [];

    // Use provided teams if available, otherwise fetch them
    if (teams && teams.length > 0) {
      console.log(`[@db:teamDb:getUserActiveTeam] Using pre-fetched teams for user: ${userId}`);
      userTeams = teams;
    } else {
      // Get the user's teams if not provided
      const result = await getUserTeams(userId, cookieStore);
      if (!result.success || !result.data || result.data.length === 0) {
        console.error(`[@db:teamDb:getUserActiveTeam] No teams found for user: ${userId}`);
        return {
          success: false,
          error: 'No teams found for user',
        };
      }
      userTeams = result.data;
    }

    // Extract the first team
    const plainTeam = userTeams[0];

    console.log(`[@db:teamDb:getUserActiveTeam] Retrieved active team for user: ${userId}`);

    return {
      success: true,
      data: plainTeam,
    };
  } catch (error) {
    console.error(`[@db:teamDb:getUserActiveTeam] Error fetching user active team:`, error);
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
): Promise<DbResponse<null>> {
  try {
    console.log(
      `[@db:teamDb:setUserActiveTeam] Setting active team: ${teamId} for user: ${userId}`,
    );

    // First check if the team exists and the user is a member
    const teamResult = await getTeamById(teamId, cookieStore);
    if (!teamResult.success || !teamResult.data) {
      console.error(`[@db:teamDb:setUserActiveTeam] Team not found: ${teamId}`);
      return { success: false, error: 'Team not found', data: null };
    }

    // Check if the user is a member of this team
    const teamsResult = await getUserTeams(userId);
    if (!teamsResult.success || !teamsResult.data) {
      console.error(`[@db:teamDb:setUserActiveTeam] Failed to get user teams: ${userId}`);
      return { success: false, error: 'Failed to get user teams', data: null };
    }

    const isMember = teamsResult.data.some((team) => team.id === teamId);
    if (!isMember) {
      console.error(`[@db:teamDb:setUserActiveTeam] User is not a member of team: ${teamId}`);
      return { success: false, error: 'User is not a member of this team', data: null };
    }

    console.log(
      `[@db:teamDb:setUserActiveTeam] Successfully set active team: ${teamId} for user: ${userId}`,
    );
    return { success: true, data: null };
  } catch (error) {
    console.error(`[@db:teamDb:setUserActiveTeam] Error setting user active team:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set user active team',
      data: null,
    };
  }
}
