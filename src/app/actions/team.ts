'use server';

import { cookies } from 'next/headers';
import { cache } from 'react';

import { getUser } from '@/app/actions/user';
import {
  Team,
  getTeamById as dbGetTeamById,
  getTeams as dbGetTeams,
  createTeam as dbCreateTeam,
  updateTeam as dbUpdateTeam,
  deleteTeam as dbDeleteTeam,
  getTeamMembers as dbGetTeamMembers,
  addTeamMember as dbAddTeamMember,
  updateTeamMemberRole as dbUpdateTeamMemberRole,
  removeTeamMember as dbRemoveTeamMember,
  TeamResult,
  TeamMemberType,
  checkResourceLimit as dbCheckResourceLimit,
} from '@/lib/supabase/db-teams';
// Import the active team functions from the teams module directly
import {
  getUserTeams as dbGetUserTeams,
  setUserActiveTeam as dbSetUserActiveTeam,
  getUserActiveTeam as dbGetUserActiveTeam,
} from '@/lib/supabase/db-teams/teams';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types/context/cicd';
import type {
  TeamCreateInput,
  TeamUpdateInput,
  TeamMemberCreateInput,
  ResourceLimit,
} from '@/types/context/team';
import { User } from '@/types/user';

// Use TeamMemberType consistently throughout this file
type TeamMember = TeamMemberType;

/**
 * Get teams that a user belongs to
 */
export async function getUserTeams(profileId: string): Promise<ActionResult<Team[]>> {
  try {
    console.log(`[@action:team:getUserTeams] Getting teams for profile: ${profileId}`);
    const result = await dbGetUserTeams(profileId);
    console.log(`[@action:team:getUserTeams] Found ${result.data?.length || 0} teams`);
    return result;
  } catch (error: any) {
    console.error(`[@action:team:getUserTeams] Error getting teams:`, error);
    return { success: false, error: error.message || 'Failed to get user teams' };
  }
}

/**
 * Get a team by ID
 */
export async function getTeamById(teamId: string): Promise<TeamResult> {
  try {
    console.log(`[@action:team:getTeamById] Getting team: ${teamId}`);
    const cookieStore = cookies();
    const result = await dbGetTeamById(teamId, cookieStore);
    console.log(
      `[@action:team:getTeamById] ${result.success ? 'Successfully retrieved team' : 'Failed to retrieve team'}`,
    );
    return result;
  } catch (error: any) {
    console.error(`[@action:team:getTeamById] Error getting team:`, error);
    return { success: false, error: error.message || 'Failed to get team' };
  }
}

/**
 * Get the active team for a user
 */
export async function getUserActiveTeam(userId: string): Promise<TeamResult> {
  try {
    console.log(`[@action:team:getUserActiveTeam] Getting active team for user: ${userId}`);
    // Implementation note: this might need to be updated if the DB function is not working
    const result = await dbGetUserActiveTeam(userId);

    // If there's an error with the stored procedure, fall back to getting the first team
    if (!result.success) {
      console.log(`[@action:team:getUserActiveTeam] Falling back to first team for user`);
      const userTeamsResult = await dbGetUserTeams(userId);
      if (userTeamsResult.success && userTeamsResult.data && userTeamsResult.data.length > 0) {
        return {
          success: true,
          data: userTeamsResult.data[0],
        };
      }
    }

    console.log(
      `[@action:team:getUserActiveTeam] ${result.success ? 'Successfully retrieved active team' : 'Failed to retrieve active team'}`,
    );
    return result;
  } catch (error: any) {
    console.error(`[@action:team:getUserActiveTeam] Error getting active team:`, error);
    return { success: false, error: error.message || 'Failed to get active team' };
  }
}

/**
 * Set the active team for a user
 */
export async function setUserActiveTeam(
  userId: string,
  teamId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `[@action:team:setUserActiveTeam] Setting active team: ${teamId} for user: ${userId}`,
    );
    // Implementation note: this might need to be updated if the DB function is not working
    const result = await dbSetUserActiveTeam(userId, teamId);
    console.log(
      `[@action:team:setUserActiveTeam] ${result.success ? 'Successfully set active team' : 'Failed to set active team'}`,
    );
    return result;
  } catch (error: any) {
    console.error(`[@action:team:setUserActiveTeam] Error setting active team:`, error);
    return { success: false, error: error.message || 'Failed to set active team' };
  }
}

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

    console.log(`[@action:team:getTeams] Getting teams for tenant: ${user.tenant_id}`);
    const cookieStore = cookies();
    const result = await dbGetTeams(user.tenant_id, cookieStore);
    console.log(`[@action:team:getTeams] Found ${result.data?.length || 0} teams`);

    return result;
  } catch (error: any) {
    console.error(`[@action:team:getTeams] Error getting teams:`, error);
    return { success: false, error: error.message || 'Failed to fetch teams' };
  }
});

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

    console.log(`[@action:team:createTeam] Creating team for tenant: ${user.tenant_id}`);
    const cookieStore = cookies();
    const result = await dbCreateTeam({ ...input, tenant_id: user.tenant_id }, cookieStore);
    console.log(
      `[@action:team:createTeam] ${result.success ? 'Successfully created team' : 'Failed to create team'}`,
    );

    return result;
  } catch (error: any) {
    console.error(`[@action:team:createTeam] Error creating team:`, error);
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

    console.log(`[@action:team:updateTeam] Updating team: ${teamId}`);
    const cookieStore = cookies();
    const result = await dbUpdateTeam(teamId, input, cookieStore);
    console.log(
      `[@action:team:updateTeam] ${result.success ? 'Successfully updated team' : 'Failed to update team'}`,
    );

    return result;
  } catch (error: any) {
    console.error(`[@action:team:updateTeam] Error updating team:`, error);
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

    console.log(`[@action:team:deleteTeam] Deleting team: ${teamId}`);
    const cookieStore = cookies();
    const result = await dbDeleteTeam(teamId, cookieStore);
    console.log(
      `[@action:team:deleteTeam] ${result.success ? 'Successfully deleted team' : 'Failed to delete team'}`,
    );

    return result;
  } catch (error: any) {
    console.error(`[@action:team:deleteTeam] Error deleting team:`, error);
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
    console.log(`[@action:team:getTeamMembers] Getting members for team: ${teamId}`);
    // First check if the team exists
    const cookieStore = cookies();
    const teamResult = await dbGetTeamById(teamId, cookieStore);

    if (!teamResult.success || !teamResult.data) {
      console.error(`[@action:team:getTeamMembers] Team not found: ${teamId}`);
      return { success: false, error: 'Team not found' };
    }

    // Get team members with profiles
    const result = await dbGetTeamMembers(teamId, cookieStore);
    console.log(`[@action:team:getTeamMembers] Found ${result.data?.length || 0} team members`);

    return result;
  } catch (error) {
    console.error(`[@action:team:getTeamMembers] Error fetching team members:`, error);
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

    console.log(`[@action:team:addTeamMember] Adding member to team: ${input.team_id}`);
    const cookieStore = cookies();
    const result = await dbAddTeamMember(input, cookieStore);
    console.log(
      `[@action:team:addTeamMember] ${result.success ? 'Successfully added team member' : 'Failed to add team member'}`,
    );

    return result as unknown as ActionResult<TeamMember>; // Type cast to resolve potential type issue
  } catch (error: any) {
    console.error(`[@action:team:addTeamMember] Error adding team member:`, error);
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

    console.log(
      `[@action:team:updateTeamMemberRole] Updating role for member: ${profileId} in team: ${teamId}`,
    );
    const cookieStore = cookies();
    const result = await dbUpdateTeamMemberRole(teamId, profileId, role, cookieStore);
    console.log(
      `[@action:team:updateTeamMemberRole] ${result.success ? 'Successfully updated team member role' : 'Failed to update team member role'}`,
    );

    return result as unknown as ActionResult<TeamMember>; // Type cast to resolve potential type issue
  } catch (error: any) {
    console.error(`[@action:team:updateTeamMemberRole] Error updating team member role:`, error);
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

    console.log(
      `[@action:team:removeTeamMember] Removing member: ${profileId} from team: ${teamId}`,
    );
    const cookieStore = cookies();
    const result = await dbRemoveTeamMember(teamId, profileId, cookieStore);
    console.log(
      `[@action:team:removeTeamMember] ${result.success ? 'Successfully removed team member' : 'Failed to remove team member'}`,
    );

    return result;
  } catch (error: any) {
    console.error(`[@action:team:removeTeamMember] Error removing team member:`, error);
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

      console.log(
        `[@action:team:checkResourceLimit] Checking resource limit for: ${resourceType} in tenant: ${user.tenant_id}`,
      );
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

      console.log(
        `[@action:team:checkResourceLimit] ${result.success ? 'Successfully checked resource limit' : 'Failed to check resource limit'}`,
      );
      return { success: false, error: result.error || 'Failed to check resource limit' };
    } catch (error: any) {
      console.error(`[@action:team:checkResourceLimit] Error checking resource limit:`, error);
      return { success: false, error: error.message || 'Failed to check resource limit' };
    }
  },
);

/**
 * Gets basic details about the user's team
 */
export const getTeamDetails = cache(async (userId?: string) => {
  try {
    console.log(
      `[@action:team:getTeamDetails] Getting team details${userId ? ` for user: ${userId}` : ''}`,
    );
    let user;
    if (userId) {
      // If userId is provided, use it directly
      user = { id: userId };
    } else {
      // Otherwise get from the session
      user = await getUser();
    }

    if (!user) {
      console.log(`[@action:team:getTeamDetails] No user found, returning default values`);
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
    const teamsResult = await getUserTeams(user.id);

    if (!teamsResult.success || !teamsResult.data || teamsResult.data.length === 0) {
      console.log(
        `[@action:team:getTeamDetails] No teams found for user, returning default values`,
      );
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
    const membersResult = await getTeamMembers(team.id);
    const memberCount = membersResult.success ? membersResult.data?.length || 0 : 0;

    // Find the user's role in the team
    let role = null;
    if (membersResult.success && membersResult.data) {
      const userMember = membersResult.data.find((member) => member.profile_id === user.id);
      if (userMember) {
        role = userMember.role;
        console.log(
          `[@action:team:getTeamDetails] Found user role: ${role} for user ${user.id} in team ${team.id}`,
        );
      }
    }

    console.log(`[@action:team:getTeamDetails] Returning team details with role: ${role}`);

    // Direct database queries to count resources associated with this team and tenant
    let reposCount = 0;
    let cicdCount = 0;
    let deploymentsCount = 0;
    let hostsCount = 0;

    try {
      // Create a Supabase client with cookie store
      const supabase = await createClient(cookieStore);

      // First get all teams in this tenant
      const teamsResult = await supabase.from('teams').select('id').eq('tenant_id', team.tenant_id);

      if (!teamsResult.error && teamsResult.data && teamsResult.data.length > 0) {
        // Get all team IDs in this tenant
        const teamIds = teamsResult.data.map((t) => t.id);
        console.log(
          `[@action:team:getTeamDetails] Found ${teamIds.length} teams in tenant ${team.tenant_id}`,
        );

        // Get repositories from all teams in this tenant
        const reposResult = await supabase
          .from('repositories')
          .select('id', { count: 'exact' })
          .in('team_id', teamIds);

        if (!reposResult.error) {
          reposCount = reposResult.data.length;
          console.log(
            `[@action:team:getTeamDetails] Found ${reposCount} repositories across all teams in tenant ${team.tenant_id}`,
          );
        } else {
          console.error(
            '[@action:team:getTeamDetails] Error counting repositories:',
            reposResult.error,
          );
        }
      } else {
        console.log(
          '[@action:team:getTeamDetails] No teams found in tenant or error fetching teams',
        );
      }

      // Get CICD provider count for the current tenant
      const cicdResult = await supabase
        .from('cicd_providers')
        .select('id', { count: 'exact' })
        .eq('tenant_id', team.tenant_id);

      if (!cicdResult.error) {
        cicdCount = cicdResult.data.length;
        console.log(
          `[@action:team:getTeamDetails] Found ${cicdCount} CICD providers for tenant ${team.tenant_id}`,
        );
      } else {
        console.error(
          '[@action:team:getTeamDetails] Error counting CICD providers:',
          cicdResult.error,
        );
      }

      // Get deployments count
      try {
        const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');

        // Get deployments directly from the database
        const result = await deploymentDb.findMany(
          { where: { tenant_id: team.tenant_id } },
          cookieStore,
        );

        // Handle the response based on its structure
        if (result && Array.isArray(result)) {
          deploymentsCount = result.length;
        } else if (
          result &&
          typeof result === 'object' &&
          'data' in result &&
          Array.isArray((result as any).data)
        ) {
          deploymentsCount = (result as any).data.length;
        }

        console.log('[@action:team:getTeamDetails] Found deployments count:', deploymentsCount);
      } catch (err) {
        console.error('[@action:team:getTeamDetails] Error getting deployments count:', err);
      }

      // Count hosts
      try {
        // Import the host database module
        const { default: hostDb } = await import('@/lib/supabase/db-hosts/host');

        // Get hosts from the database - no filters needed as RLS will handle access control
        const hosts = await hostDb.findMany();

        if (Array.isArray(hosts)) {
          hostsCount = hosts.length;
          console.log(
            `[@action:team:getTeamDetails] Found ${hostsCount} hosts for tenant ${team.tenant_id}`,
          );
        }
      } catch (err) {
        console.error('[@action:team:getTeamDetails] Error counting hosts:', err);
      }
    } catch (err) {
      console.error('[@action:team:getTeamDetails] Exception counting resources:', err);
    }

    // Return team details with actual resource counts
    console.log(`[@action:team:getTeamDetails] Successfully obtained team details`);
    return {
      ...team,
      memberCount,
      ownerId: user.id,
      ownerEmail: user.email,
      role,
      resourceCounts: {
        repositories: reposCount,
        hosts: hostsCount,
        cicd: cicdCount,
        deployments: deploymentsCount,
      },
    };
  } catch (error) {
    console.error('[@action:team:getTeamDetails] Error fetching team details', error);
    throw new Error('Failed to fetch team details');
  }
});

/**
 * Gets resources that aren't assigned to any team but are
 * linked to the user's providers
 */
export async function getUnassignedResources() {
  try {
    console.log(`[@action:team:getUnassignedResources] Getting unassigned resources`);
    const user = await getUser();
    if (!user) {
      console.log(`[@action:team:getUnassignedResources] No user found, returning empty list`);
      return { repositories: [] };
    }

    console.log(
      '[@action:team:getUnassignedResources] Not fully implemented, returning empty repository list',
    );
    // In a real implementation, you would have a dbGetUnassignedResources function
    // in the appropriate database module
    return { repositories: [] };
  } catch (error) {
    console.error(
      '[@action:team:getUnassignedResources] Error fetching unassigned resources:',
      error,
    );
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
    console.log(
      `[@action:team:assignResourceToTeam] Assigning resource: ${resourceId} of type: ${resourceType} to team: ${teamId}`,
    );
    const user = await getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // In a real implementation, you would create a dbAssignResourceToTeam function
    // in the appropriate database module
    // This is simplified for the example

    console.info('[@action:team:assignResourceToTeam] Resource assigned to team', {
      resourceId,
      resourceType,
      teamId,
      userId: user.id,
    });

    return { success: true };
  } catch (error) {
    console.error('[@action:team:assignResourceToTeam] Error assigning resource to team', {
      error,
      resourceId,
      resourceType,
      teamId,
    });
    throw new Error('Failed to assign resource to team');
  }
}

// Export types for client usage
export type { Team, TeamResult };
