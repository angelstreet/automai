/**
 * Team Database Layer
 * Handles database operations for teams
 */
import { createClient } from '@/lib/supabase/server';

// Types from team context type
import { Team, TeamMember } from '@/types/context/teamContextType';

/**
 * Standard database response interface
 */
export interface DbResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string;
  count?: number;
}

/**
 * Get all teams for a user
 */
export async function getTeamsForUser(userId: string): Promise<DbResponse<Team[]>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('teams')
      .select('*, team_members(role)')
      .eq('team_members.user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get teams' };
  }
}

/**
 * Get a team by ID
 */
export async function getTeamById(id: string): Promise<DbResponse<Team>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get team' };
  }
}

/**
 * Create a new team
 */
export async function createTeam(team: Partial<Team>): Promise<DbResponse<Team>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('teams')
      .insert([team])
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create team' };
  }
}

/**
 * Update a team
 */
export async function updateTeam(id: string, team: Partial<Team>): Promise<DbResponse<Team>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('teams')
      .update(team)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update team' };
  }
}

/**
 * Delete a team
 */
export async function deleteTeam(id: string): Promise<DbResponse<null>> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete team' };
  }
}

/**
 * Get team members
 */
export async function getTeamMembers(teamId: string): Promise<DbResponse<TeamMember[]>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('team_members')
      .select('*, profiles:user_id(*)')
      .eq('team_id', teamId);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get team members' };
  }
}

/**
 * Add a member to a team
 */
export async function addTeamMember(teamId: string, userId: string, role: string): Promise<DbResponse<TeamMember>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('team_members')
      .insert([{
        team_id: teamId,
        user_id: userId,
        role
      }])
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add team member' };
  }
}

/**
 * Update a team member's role
 */
export async function updateTeamMemberRole(teamId: string, userId: string, role: string): Promise<DbResponse<TeamMember>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update team member role' };
  }
}

/**
 * Remove a member from a team
 */
export async function removeTeamMember(teamId: string, userId: string): Promise<DbResponse<null>> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to remove team member' };
  }
}

// Default export for all team database operations
const teamDb = {
  getTeamsForUser,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember
};

export default teamDb;