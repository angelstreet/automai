import { createClient } from '@/lib/supabase/server';
import type { DbResponse } from '@/lib/supabase/db';
import type { Team, TeamCreateInput, TeamUpdateInput } from '@/types/context/team';

/**
 * Get all teams for a tenant
 * @param tenantId Tenant ID
 * @returns Teams belonging to the tenant
 */
export async function getTeams(tenantId: string): Promise<DbResponse<Team[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Team[],
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch teams',
    };
  }
}

/**
 * Get a single team by ID
 * @param teamId Team ID
 * @returns Team data
 */
export async function getTeam(teamId: string): Promise<DbResponse<Team>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Team,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch team',
    };
  }
}

/**
 * Create a new team
 * @param input Team data to create
 * @returns Created team data
 */
export async function createTeam(
  input: TeamCreateInput & { tenant_id: string },
): Promise<DbResponse<Team>> {
  try {
    const supabase = await createClient();

    // First fetch the user to set created_by
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      return { success: false, error: userError.message };
    }

    const { data, error } = await supabase
      .from('teams')
      .insert({
        ...input,
        created_by: userData.user.id,
      })
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Team,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create team',
    };
  }
}

/**
 * Update an existing team
 * @param teamId Team ID to update
 * @param input Team data to update
 * @returns Updated team data
 */
export async function updateTeam(
  teamId: string,
  input: TeamUpdateInput,
): Promise<DbResponse<Team>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('teams')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId)
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Team,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update team',
    };
  }
}

/**
 * Delete a team
 * @param teamId Team ID to delete
 * @returns Success status
 */
export async function deleteTeam(teamId: string): Promise<DbResponse<null>> {
  try {
    const supabase = await createClient();

    // Check if team is default - don't allow deleting default teams
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('is_default')
      .eq('id', teamId)
      .single();

    if (teamError) {
      return { success: false, error: teamError.message };
    }

    if (teamData?.is_default) {
      return {
        success: false,
        error: 'Cannot delete the default team. Make another team default first.',
      };
    }

    const { error } = await supabase.from('teams').delete().eq('id', teamId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete team',
    };
  }
}
