import { supabase } from '@/lib/supabase/browser-client';
import { PostgrestError } from '@supabase/supabase-js';

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
 * Create a new team
 */
export async function createTeam(payload: CreateTeamPayload): Promise<TeamResult> {
  try {
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
    console.error('Error creating team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to create team',
    };
  }
}

/**
 * Get all teams for a tenant
 */
export async function getTeams(tenantId: string): Promise<TeamsResult> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error fetching teams:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to fetch teams',
    };
  }
}

/**
 * Get teams that a user belongs to
 */
export async function getUserTeams(profileId: string): Promise<TeamsResult> {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('team:teams(*)')
      .eq('profile_id', profileId);

    if (error) throw error;

    const teams = data.map((item) => item.team as Team);

    return {
      success: true,
      data: teams,
    };
  } catch (error) {
    console.error('Error fetching user teams:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to fetch user teams',
    };
  }
}

/**
 * Get a team by ID
 */
export async function getTeamById(teamId: string): Promise<TeamResult> {
  try {
    const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error fetching team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to fetch team',
    };
  }
}

/**
 * Update a team
 */
export async function updateTeam(teamId: string, payload: UpdateTeamPayload): Promise<TeamResult> {
  try {
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
    console.error('Error updating team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to update team',
    };
  }
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);

    if (error) throw error;

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to delete team',
    };
  }
}

/**
 * Get members of a team
 */
export async function getTeamMembers(teamId: string): Promise<TeamMembersResult> {
  try {
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
    console.error('Error fetching team members:', error);
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
): Promise<TeamMemberResult> {
  try {
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
    console.error('Error adding team member:', error);
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
): Promise<TeamMemberResult> {
  try {
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
    console.error('Error updating team member:', error);
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
): Promise<{ success: boolean; error?: string }> {
  try {
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
    console.error('Error removing team member:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to remove team member',
    };
  }
}

/**
 * Get user's active team
 */
export async function getUserActiveTeam(profileId: string): Promise<TeamResult> {
  try {
    const { data: activeTeamId, error: teamError } = await supabase.rpc('get_user_active_team', {
      p_profile_id: profileId,
    });

    if (teamError) throw teamError;

    if (!activeTeamId) {
      return {
        success: false,
        error: 'No active team found',
      };
    }

    return getTeamById(activeTeamId);
  } catch (error) {
    console.error('Error fetching user active team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to fetch active team',
    };
  }
}

/**
 * Set user's active team
 */
export async function setUserActiveTeam(
  profileId: string,
  teamId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // We store the active team in the profile's metadata
    const { error } = await supabase
      .from('profiles')
      .update({
        meta: { active_team_id: teamId },
      })
      .eq('id', profileId);

    if (error) throw error;

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error setting active team:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to set active team',
    };
  }
}
