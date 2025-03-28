import { createClient } from '@/lib/supabase/server';
import type { DbResponse } from '@/lib/supabase/db';
import type { TeamMember, TeamMemberCreateInput } from '@/types/context/team';

/**
 * Get team members for a specific team
 * @param teamId Team ID
 * @param cookieStore Cookie store for authentication
 * @returns Team members with their profile data
 */
export async function getTeamMembers(teamId: string): Promise<DbResponse<TeamMember[]>> {
  try {
    const supabase = await createClient();

    // Now query team members with direct filtering
    const { data, error } = await supabase
      .from('team_members')
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
      .eq('team_id', teamId);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as TeamMember[],
    };
  } catch (error: any) {
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
export async function addTeamMember(input: TeamMemberCreateInput): Promise<DbResponse<TeamMember>> {
  try {
    const supabase = await createClient();

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
      data: data as TeamMember,
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
): Promise<DbResponse<TeamMember>> {
  try {
    const supabase = await createClient();

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
      data: data as TeamMember,
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
): Promise<DbResponse<null>> {
  try {
    const supabase = await createClient();

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
