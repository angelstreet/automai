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
 * This ensures we only return primitive types that can be safely serialized
 */
function createSerializableTeam(rawTeam: any): Team {
  // Log the input object
  console.log(`[@db:teamDb:createSerializableTeam] Input object type:`, typeof rawTeam);
  console.log(
    `[@db:teamDb:createSerializableTeam] Input constructor:`,
    rawTeam?.constructor?.name || 'unknown',
  );
  console.log(
    `[@db:teamDb:createSerializableTeam] Input prototype:`,
    Object.getPrototypeOf(rawTeam)?.constructor?.name || 'unknown',
  );
  console.log(`[@db:teamDb:createSerializableTeam] Input keys:`, Object.keys(rawTeam || {}));

  // Log any suspicious properties that might cause serialization issues
  for (const key in rawTeam) {
    const value = rawTeam[key];
    if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
      console.log(
        `[@db:teamDb:createSerializableTeam] Complex property "${key}" type:`,
        typeof value,
      );
      console.log(
        `[@db:teamDb:createSerializableTeam] Complex property "${key}" constructor:`,
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
  console.log(`[@db:teamDb:createSerializableTeam] Output object:`, serialized);
  console.log(
    `[@db:teamDb:createSerializableTeam] JSON test:`,
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

    // Create an array of plain serializable objects using our helper
    const plainTeams = data.map((rawTeam) => createSerializableTeam(rawTeam));

    console.log(
      `[@db:teamDb:getTeams] Constructed ${plainTeams.length} serializable team objects for tenant: ${tenantId}`,
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
    // Get user's teams (both owned and as a member)
    const supabase = await createClient(cookieStore);
    console.log(`[@db:teamDb:getUserTeams] Fetching teams for user: ${profileId}`);

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

    // Log the raw data from Supabase
    console.log(`[@db:teamDb:getUserTeams] Raw data from Supabase, length:`, data.length);
    if (data.length > 0) {
      const firstTeam = data[0];
      console.log(`[@db:teamDb:getUserTeams] First team type:`, typeof firstTeam);
      console.log(
        `[@db:teamDb:getUserTeams] First team constructor:`,
        firstTeam?.constructor?.name || 'unknown',
      );
      console.log(
        `[@db:teamDb:getUserTeams] First team prototype:`,
        Object.getPrototypeOf(firstTeam)?.constructor?.name || 'unknown',
      );
      console.log(`[@db:teamDb:getUserTeams] First team keys:`, Object.keys(firstTeam || {}));

      // Check serialization of raw data
      try {
        const jsonTest = JSON.stringify(firstTeam);
        console.log(
          `[@db:teamDb:getUserTeams] Direct JSON test on first team: Success, length:`,
          jsonTest.length,
        );
      } catch (err) {
        console.error(`[@db:teamDb:getUserTeams] Direct JSON test on first team failed:`, err);
      }
    }

    // Create an array of plain serializable objects using our helper
    const plainTeams = data.map((rawTeam) => createSerializableTeam(rawTeam));

    // Test serialization of processed data
    if (plainTeams.length > 0) {
      try {
        const jsonTest = JSON.stringify(plainTeams[0]);
        console.log(
          `[@db:teamDb:getUserTeams] Helper JSON test on first team: Success, length:`,
          jsonTest.length,
        );
      } catch (err) {
        console.error(`[@db:teamDb:getUserTeams] Helper JSON test on first team failed:`, err);
      }
    }

    console.log(
      `[@db:teamDb:getUserTeams] Constructed ${plainTeams.length} serializable team objects for user: ${profileId}`,
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
    console.log(`[@db:teamDb:getTeamById] Fetching team with ID: ${teamId}`);

    const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single();

    if (error) throw error;

    // Log the raw data from Supabase
    console.log(`[@db:teamDb:getTeamById] Raw data from Supabase type:`, typeof data);
    console.log(
      `[@db:teamDb:getTeamById] Raw data constructor:`,
      data?.constructor?.name || 'unknown',
    );
    console.log(
      `[@db:teamDb:getTeamById] Raw data prototype:`,
      Object.getPrototypeOf(data)?.constructor?.name || 'unknown',
    );
    console.log(`[@db:teamDb:getTeamById] Raw data keys:`, Object.keys(data || {}));

    // Check serialization of raw data
    try {
      const jsonTest = JSON.stringify(data);
      console.log(`[@db:teamDb:getTeamById] Direct JSON test: Success, length:`, jsonTest.length);
    } catch (err) {
      console.error(`[@db:teamDb:getTeamById] Direct JSON test failed:`, err);
    }

    // Create a plain serializable object using our helper
    const plainTeam = createSerializableTeam(data);

    // Test serialization of processed data
    try {
      const jsonTest = JSON.stringify(plainTeam);
      console.log(`[@db:teamDb:getTeamById] Helper JSON test: Success, length:`, jsonTest.length);
    } catch (err) {
      console.error(`[@db:teamDb:getTeamById] Helper JSON test failed:`, err);
    }

    console.log(`[@db:teamDb:getTeamById] Constructed serializable team object for id: ${teamId}`);

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
 */
export async function getUserActiveTeam(
  userId: string,
  cookieStore?: any,
): Promise<DbResponse<Team>> {
  try {
    console.log(`[@db:teamDb:getUserActiveTeam] Getting active team for user: ${userId}`);

    // Since the stored procedure doesn't exist, use a direct query to get the user's teams
    const result = await getUserTeams(userId, cookieStore);

    console.log(`[@db:teamDb:getUserActiveTeam] Result from getUserTeams type:`, typeof result);
    console.log(`[@db:teamDb:getUserActiveTeam] Success:`, result.success);

    if (result.success && result.data && result.data.length > 0) {
      // Extract the first team
      const rawTeam = result.data[0];

      console.log(`[@db:teamDb:getUserActiveTeam] Raw team object type:`, typeof rawTeam);
      console.log(
        `[@db:teamDb:getUserActiveTeam] Raw team object constructor:`,
        rawTeam?.constructor?.name || 'unknown',
      );

      // Try direct JSON serialization first to see if it works without our helper
      try {
        const jsonTest = JSON.stringify(rawTeam);
        console.log(
          `[@db:teamDb:getUserActiveTeam] Direct JSON test: Success, length:`,
          jsonTest.length,
        );
      } catch (err) {
        console.error(`[@db:teamDb:getUserActiveTeam] Direct JSON test failed:`, err);
      }

      // Create a plain serializable object using our helper
      const plainTeam = createSerializableTeam(rawTeam);

      // Try JSON serialization again after our helper
      try {
        const jsonTest = JSON.stringify(plainTeam);
        console.log(
          `[@db:teamDb:getUserActiveTeam] Helper JSON test: Success, length:`,
          jsonTest.length,
        );
      } catch (err) {
        console.error(`[@db:teamDb:getUserActiveTeam] Helper JSON test failed:`, err);
      }

      console.log(
        `[@db:teamDb:getUserActiveTeam] Constructed serializable team object for user: ${userId}`,
      );

      // Return the plain object
      return {
        success: true,
        data: plainTeam,
      };
    }

    console.error(`[@db:teamDb:getUserActiveTeam] No teams found for user: ${userId}`);
    return {
      success: false,
      error: 'No teams found for user',
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

    // In a real implementation, we would save the active team ID to the database
    // For now, we'll just return success since we're handling this in memory via context
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
