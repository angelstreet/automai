import type { DbResponse } from '@/lib/supabase/db';
import { createClient } from '@/lib/supabase/server';
import type { TeamMember, TeamMemberCreateInput } from '@/types/context/team';

// Define user data structure
interface UserData {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
}

// Define member data structure from database
interface MemberData {
  team_id: string;
  profile_id: string;
  role: string;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    avatar_url?: string | null;
    tenant_id?: string;
    tenant_name?: string;
    role?: string;
  };
  user?: {
    id: string;
    name?: string;
    email?: string;
    avatar_url?: string | null;
  };
}

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

    // Get team members with profiles and attempt to join with auth data
    // Using direct SQL to access auth.users through a join
    const { data, error } = await supabase.rpc('get_team_members_with_user_data', {
      p_team_id: teamId,
    });

    if (error) {
      console.error('Error fetching team members:', error);
      return { success: false, error: error.message };
    }

    // Process the results to match the expected format
    if (data && data.length > 0) {
      data.forEach((member) => {
        // Use email username if name is not available
        if (member.email && (!member.user || !member.user.name)) {
          const username = member.email.split('@')[0];
          if (!member.user) {
            member.user = { id: member.profile_id };
          }
          member.user.name = username;
        }

        // Ensure user object exists
        if (!member.user) {
          member.user = {
            id: member.profile_id,
            name: member.profiles?.tenant_name || 'User',
            email: 'Email unavailable',
            avatar_url: member.profiles?.avatar_url,
          };
        }
      });
    }

    console.log('Team members with user info:', data);

    return {
      success: true,
      data: data as TeamMember[],
    };
  } catch (error: any) {
    console.error('Error in getTeamMembers:', error);
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
  cookieStore: any,
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
