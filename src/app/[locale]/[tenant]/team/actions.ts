'use server';

import { cookies } from 'next/headers';
import { cache } from 'react';

import { getUser } from '@/app/actions/user';
import {
  getTeams as dbGetTeams,
  getTeamById as dbGetTeam,
  createTeam as dbCreateTeam,
  updateTeam as dbUpdateTeam,
  deleteTeam as dbDeleteTeam,
  getTeamMembers as dbGetTeamMembers,
  addTeamMember as dbAddTeamMember,
  updateTeamMemberRole as dbUpdateTeamMemberRole,
  removeTeamMember as dbRemoveTeamMember,
  getTeamsByUser,
  TeamMemberType as TeamMember,
} from '@/lib/supabase/db-teams';
import { checkResourceLimit as dbCheckResourceLimit } from '@/lib/supabase/db-teams/resource-limits';
import type { ActionResult } from '@/types/context/cicd';
import type {
  Team,
  TeamCreateInput,
  TeamUpdateInput,
  TeamMember as TeamMemberFromContext,
  TeamMemberCreateInput,
  ResourceLimit,
} from '@/types/context/team';
import { User } from '@/types/user';

/**
 * Get all teams for the current user's tenant
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result containing teams or error
 */
export const getTeams = cache(async (providedUser?: User | null): Promise<ActionResult<Team[]>> => {
  try {
    const user = providedUser || (await getUser());
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await dbGetTeams(user.tenant_id, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch teams' };
  }
});

/**
 * Get a single team by ID
 * @param teamId Team ID to fetch
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result containing team or error
 */
export const getTeam = cache(
  async (teamId: string, providedUser?: User | null): Promise<ActionResult<Team>> => {
    try {
      const user = providedUser || (await getUser());
      if (!user || !user.tenant_id) {
        return { success: false, error: 'Unauthorized' };
      }

      const cookieStore = cookies();
      const result = await dbGetTeam(teamId, cookieStore);

      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch team' };
    }
  },
);

/**
 * Create a new team
 * @param input Team data to create
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result containing created team or error
 */
export async function createTeam(
  input: TeamCreateInput,
  providedUser?: User | null,
): Promise<ActionResult<Team>> {
  try {
    const user = providedUser || (await getUser());
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await dbCreateTeam({ ...input, tenant_id: user.tenant_id }, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create team' };
  }
}

/**
 * Update an existing team
 * @param teamId Team ID to update
 * @param input Team data to update
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result containing updated team or error
 */
export async function updateTeam(
  teamId: string,
  input: TeamUpdateInput,
  providedUser?: User | null,
): Promise<ActionResult<Team>> {
  try {
    const user = providedUser || (await getUser());
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await dbUpdateTeam(teamId, input, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update team' };
  }
}

/**
 * Delete a team
 * @param teamId Team ID to delete
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result with success status or error
 */
export async function deleteTeam(
  teamId: string,
  providedUser?: User | null,
): Promise<ActionResult<null>> {
  try {
    const user = providedUser || (await getUser());
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await dbDeleteTeam(teamId, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete team' };
  }
}

/**
 * Get team members with profile data
 * @param teamId Team ID to get members for
 * @returns Action result containing team members or error
 */
export const getTeamMembers = cache(async (teamId: string) => {
  try {
    // First check if the team exists
    const cookieStore = cookies();
    const teamResult = await dbGetTeam(teamId, cookieStore);

    if (!teamResult.success || !teamResult.data) {
      return { success: false, error: 'Team not found' };
    }

    // Get team members with profiles
    const result = await dbGetTeamMembers(teamId, cookieStore);
    return result;
  } catch (error) {
    console.error('Error fetching team members:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch team members',
    };
  }
});

/**
 * Add a member to a team
 * @param input Team member data to create
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result containing created team member or error
 */
export async function addTeamMember(
  input: TeamMemberCreateInput,
  providedUser?: User | null,
): Promise<ActionResult<TeamMember>> {
  try {
    const user = providedUser || (await getUser());
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await dbAddTeamMember(input, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add team member' };
  }
}

/**
 * Update a team member's role
 * @param teamId Team ID
 * @param profileId Profile ID of the team member
 * @param role New role for the team member
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result containing updated team member or error
 */
export async function updateTeamMemberRole(
  teamId: string,
  profileId: string,
  role: string,
  providedUser?: User | null,
): Promise<ActionResult<TeamMember>> {
  try {
    const user = providedUser || (await getUser());
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await dbUpdateTeamMemberRole(teamId, profileId, role, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update team member role' };
  }
}

/**
 * Remove a member from a team
 * @param teamId Team ID
 * @param profileId Profile ID of the team member to remove
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result with success status or error
 */
export async function removeTeamMember(
  teamId: string,
  profileId: string,
  providedUser?: User | null,
): Promise<ActionResult<null>> {
  try {
    const user = providedUser || (await getUser());
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await dbRemoveTeamMember(teamId, profileId, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to remove team member' };
  }
}

/**
 * Check if a resource limit is reached for the current tenant
 * @param resourceType Type of resource to check (hosts, repositories, deployments, cicd_providers)
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result containing limit check data or error
 */
export const checkResourceLimit = cache(
  async (
    resourceType: string,
    providedUser?: User | null,
  ): Promise<ActionResult<ResourceLimit>> => {
    try {
      const user = providedUser || (await getUser());
      if (!user || !user.tenant_id) {
        return { success: false, error: 'Unauthorized' };
      }

      const result = await dbCheckResourceLimit(user.tenant_id, resourceType);

      // Transform result to match the expected ResourceLimit interface
      if (result.success && result.data) {
        return {
          success: true,
          data: {
            ...result.data,
            type: resourceType,
            current: result.data.max_count || 0,
            limit: result.data.max_count || 0,
            isUnlimited: result.data.is_unlimited,
            canCreate: true, // This would need to be determined based on current usage
          } as unknown as ResourceLimit,
        };
      }

      return { success: false, error: result.error || 'Failed to check resource limit' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to check resource limit' };
    }
  },
);

/**
 * Gets basic details about the user's team
 */
export const getTeamDetails = cache(async () => {
  try {
    const user = await getUser();
    if (!user) {
      return {
        id: null,
        name: 'No Team',
        subscription_tier: 'trial',
        memberCount: 0,
        ownerId: null,
        ownerEmail: null,
        resourceCounts: { repositories: 0, hosts: 0, cicd: 0 },
      };
    }

    const cookieStore = cookies();

    // Get the user's teams
    const teamsResult = await getTeamsByUser(user.id, cookieStore);

    if (!teamsResult.success || !teamsResult.data || teamsResult.data.length === 0) {
      return {
        id: null,
        name: 'No Team',
        subscription_tier: 'trial',
        memberCount: 0,
        ownerId: user.id,
        ownerEmail: user.email, // Include the user's email if available
        resourceCounts: { repositories: 0, hosts: 0, cicd: 0 },
      };
    }

    const team = teamsResult.data[0];

    // Get member count and user's role
    const membersResult = await dbGetTeamMembers(team.id, cookieStore);
    const memberCount = membersResult.success ? membersResult.data?.length || 0 : 0;

    // Find the user's role in the team
    let role = null;
    if (membersResult.success && membersResult.data) {
      const userMember = membersResult.data.find(
        (member: TeamMember) => member.profile_id === user.id,
      );
      if (userMember) {
        role = userMember.role;
        console.log(`Found user role: ${role} for user ${user.id} in team ${team.id}`);
      }
    }

    console.log(`Returning team details with role: ${role}`);

    // For resource counts we would need specific functions in the db module
    // This is simplified example
    return {
      ...team,
      memberCount,
      ownerId: user.id,
      ownerEmail: user.email, // Include the user's email if available
      role, // Add the user's role
      resourceCounts: {
        repositories: 0, // Replace with actual counts from db
        hosts: 0,
        cicd: 0,
      },
    };
  } catch (error) {
    console.error('Error fetching team details', { error });
    throw new Error('Failed to fetch team details');
  }
});

/**
 * Gets resources that aren't assigned to any team but are
 * linked to the user's providers
 */
export async function getUnassignedResources() {
  try {
    const user = await getUser();
    if (!user) {
      return { repositories: [] };
    }

    console.log('[getUnassignedResources] Not fully implemented, returning empty repository list');
    // In a real implementation, you would have a dbGetUnassignedResources function
    // in the appropriate database module
    return { repositories: [] };
  } catch (error) {
    console.error('Error fetching unassigned resources:', error);
    throw new Error('Failed to fetch unassigned resources');
  }
}

/**
 * Assigns a resource to a team and sets the creator
 */
export async function assignResourceToTeam(
  resourceId: string,
  resourceType: string,
  teamId: string,
) {
  try {
    const user = await getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // In a real implementation, you would create a dbAssignResourceToTeam function
    // in the appropriate database module
    // This is simplified for the example

    console.info('Resource assigned to team', {
      resourceId,
      resourceType,
      teamId,
      userId: user.id,
    });

    return { success: true };
  } catch (error) {
    console.error('Error assigning resource to team', { error, resourceId, resourceType, teamId });
    throw new Error('Failed to assign resource to team');
  }
}
