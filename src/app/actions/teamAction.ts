'use server';

import { cookies } from 'next/headers';
import { cache } from 'react';

import { getUser } from '@/app/actions/userAction';
import {
  getUserTeams as dbGetUserTeams,
  getTeamById as dbGetTeamById,
  getTeams as dbGetTeams,
  createTeam as dbCreateTeam,
  updateTeam as dbUpdateTeam,
  deleteTeam as dbDeleteTeam,
  getUserActiveTeam as dbGetUserActiveTeam,
  setUserActiveTeam as dbSetUserActiveTeam,
  type Team,
} from '@/lib/db/teamDb';
import teamMemberDb from '@/lib/db/teamMemberDb';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types/context/cicdContextType';
import { TeamMember } from '@/types/context/teamContextType';
import type {
  TeamCreateInput,
  TeamUpdateInput,
  TeamMemberCreateInput,
  ResourceLimit,
} from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

/**
 * Get teams that a user belongs to
 */
export const getUserTeams = cache(async (profileId: string): Promise<Team[]> => {
  try {
    console.log(`[@action:team:getUserTeams] Getting teams for profile: ${profileId}`);
    const cookieStore = await cookies();
    const result = await dbGetUserTeams(profileId, cookieStore);

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get user teams');
    }

    return result.data;
  } catch (e) {
    console.error('[@action:team:getUserTeams] Error:', e);
    throw e;
  }
});

/**
 * Get a team by ID
 */
export const getTeamById = cache(async (teamId: string): Promise<Team> => {
  try {
    console.log(`[@action:team:getTeamById] Getting team: ${teamId}`);
    const cookieStore = await cookies();
    const result = await dbGetTeamById(teamId, cookieStore);
    console.log(
      `[@action:team:getTeamById] ${result.success ? 'Successfully retrieved team' : 'Failed to retrieve team'}`,
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get team');
    }

    return result.data;
  } catch (e) {
    console.error('[@action:team:getTeamById] Error:', e);
    throw e;
  }
});

/**
 * Get the active team for a user
 */
export const getUserActiveTeam = cache(async (userId: string): Promise<Team> => {
  try {
    console.log(`[@action:team:getUserActiveTeam] Getting active team for user: ${userId}`);
    const cookieStore = await cookies();
    const result = await dbGetUserActiveTeam(userId, cookieStore);

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get user active team');
    }

    return result.data;
  } catch (e) {
    console.error('[@action:team:getUserActiveTeam] Error:', e);
    throw e;
  }
});

/**
 * Set the active team for a user
 */
export const setUserActiveTeam = cache(async (userId: string, teamId: string): Promise<void> => {
  try {
    console.log(
      `[@action:team:setUserActiveTeam] Setting active team: ${teamId} for user: ${userId}`,
    );
    const cookieStore = await cookies();
    const result = await dbSetUserActiveTeam(userId, teamId, cookieStore);

    if (!result.success) {
      throw new Error(result.error || 'Failed to set user active team');
    }
  } catch (e) {
    console.error('[@action:team:setUserActiveTeam] Error:', e);
    throw e;
  }
});

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
    const cookieStore = await cookies();
    const result = await dbGetTeams(user.tenant_id, cookieStore);
    console.log(`[@action:team:getTeams] Found ${result.data?.length || 0} teams`);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'No teams found for tenant',
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error: any) {
    console.error(`[@action:team:getTeams] Error getting teams:`, error);
    return {
      success: false,
      error: error.message || 'Failed to fetch teams',
    };
  }
});

/**
 * Create a new team
 * @param input Team data to create
 * @param user User creating the team
 * @returns Created team
 */
export const createTeam = cache(async (input: TeamCreateInput, user: User): Promise<Team> => {
  try {
    console.log(`[@action:team:createTeam] Creating team for tenant: ${user.tenant_id}`);
    const cookieStore = await cookies();
    const result = await dbCreateTeam({ ...input, tenant_id: user.tenant_id }, cookieStore);
    console.log(
      `[@action:team:createTeam] ${result.success ? 'Successfully created team' : 'Failed to create team'}`,
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create team');
    }

    return result.data;
  } catch (e) {
    console.error('[@action:team:createTeam] Error:', e);
    throw e;
  }
});

/**
 * Update an existing team
 * @param teamId Team ID to update
 * @param input Team data to update
 * @returns Updated team
 */
export const updateTeam = cache(async (teamId: string, input: TeamUpdateInput): Promise<Team> => {
  try {
    console.log(`[@action:team:updateTeam] Updating team: ${teamId}`);
    const cookieStore = await cookies();
    const result = await dbUpdateTeam(teamId, input, cookieStore);
    console.log(
      `[@action:team:updateTeam] ${result.success ? 'Successfully updated team' : 'Failed to update team'}`,
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update team');
    }

    return result.data;
  } catch (e) {
    console.error('[@action:team:updateTeam] Error:', e);
    throw e;
  }
});

/**
 * Delete a team
 * @param teamId Team ID to delete
 */
export const deleteTeam = cache(async (teamId: string): Promise<void> => {
  try {
    console.log(`[@action:team:deleteTeam] Deleting team: ${teamId}`);
    const cookieStore = await cookies();
    const result = await dbDeleteTeam(teamId, cookieStore);
    console.log(
      `[@action:team:deleteTeam] ${result.success ? 'Successfully deleted team' : 'Failed to delete team'}`,
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete team');
    }
  } catch (e) {
    console.error('[@action:team:deleteTeam] Error:', e);
    throw e;
  }
});

/**
 * Get all members of a team
 */
export const getTeamMembers = cache(async (teamId: string): Promise<TeamMember[]> => {
  try {
    console.log(`[@action:team:getTeamMembers] Getting members for team: ${teamId}`);
    const cookieStore = await cookies();
    const result = await teamMemberDb.getTeamMembers(teamId, cookieStore);
    console.log(`[@action:team:getTeamMembers] Found ${result.data?.length || 0} members`);

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get team members');
    }

    return result.data;
  } catch (e) {
    console.error('[@action:team:getTeamMembers] Error:', e);
    throw e;
  }
});

/**
 * Add a member to a team
 * @param input Team member data to create
 * @returns Created team member
 */
export const addTeamMember = cache(async (input: TeamMemberCreateInput): Promise<TeamMember> => {
  try {
    console.log(`[@action:team:addTeamMember] Adding member to team: ${input.team_id}`);
    const cookieStore = await cookies();
    const result = await teamMemberDb.addTeamMember(input, cookieStore);
    console.log(
      `[@action:team:addTeamMember] ${result.success ? 'Successfully added team member' : 'Failed to add team member'}`,
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to add team member');
    }

    return result.data;
  } catch (error) {
    console.error(`[@action:team:addTeamMember] Error adding team member:`, error);
    throw error;
  }
});

/**
 * Update a team member's role
 * @param teamId Team ID
 * @param profileId Profile ID of the team member
 * @param role New role for the team member
 * @returns Updated team member
 */
export const updateTeamMemberRole = cache(
  async (teamId: string, profileId: string, role: string): Promise<TeamMember> => {
    try {
      console.log(
        `[@action:team:updateTeamMemberRole] Updating role for member: ${profileId} in team: ${teamId}`,
      );
      const cookieStore = await cookies();
      const result = await teamMemberDb.updateTeamMemberRole(teamId, profileId, role, cookieStore);
      console.log(
        `[@action:team:updateTeamMemberRole] ${result.success ? 'Successfully updated team member role' : 'Failed to update team member role'}`,
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update team member role');
      }

      return result.data;
    } catch (error) {
      console.error(`[@action:team:updateTeamMemberRole] Error updating team member role:`, error);
      throw error;
    }
  },
);

/**
 * Remove a member from a team
 * @param teamId Team ID
 * @param profileId Profile ID of the team member to remove
 */
export const removeTeamMember = cache(async (teamId: string, profileId: string): Promise<void> => {
  try {
    console.log(
      `[@action:team:removeTeamMember] Removing member: ${profileId} from team: ${teamId}`,
    );
    const cookieStore = await cookies();
    const result = await teamMemberDb.removeTeamMember(teamId, profileId, cookieStore);
    console.log(
      `[@action:team:removeTeamMember] ${result.success ? 'Successfully removed team member' : 'Failed to remove team member'}`,
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to remove team member');
    }
  } catch (error) {
    console.error(`[@action:team:removeTeamMember] Error removing team member:`, error);
    throw error;
  }
});

/**
 * Check if a resource limit is reached for the current tenant
 * @param resourceType Type of resource to check (hosts, repositories, deployments, cicd_providers)
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Resource limit information
 */
export const checkResourceLimit = cache(
  async (resourceType: string, providedUser?: User | null): Promise<ResourceLimit> => {
    try {
      const user = providedUser || (await getUser());
      if (!user || !user.tenant_id) {
        throw new Error('Unauthorized');
      }

      console.log(
        `[@action:team:checkResourceLimit] Checking resource limit for: ${resourceType} in tenant: ${user.tenant_id}`,
      );

      // TODO: Implement resource limit checking via DB layer when available
      // For now, return a default response
      return {
        type: resourceType,
        current: 0,
        limit: 0,
        isUnlimited: true,
        canCreate: true,
      };
    } catch (error: any) {
      console.error(`[@action:team:checkResourceLimit] Error checking resource limit:`, error);
      throw error;
    }
  },
);

/**
 * Get details for a team including member count, user role, and resource counts
 */
export const getTeamDetails = cache(async () => {
  try {
    //console.log(`[@action:team:getTeamDetails] Getting team details`);

    let user;
    try {
      user = await getUser();
      if (!user) {
        console.log(`[@action:team:getTeamDetails] No user found, returning default data`);
        return {
          success: true,
          data: {
            team: null,
            memberCount: 0,
            userRole: null,
            resourceCounts: {
              repositories: 0,
              deployments: 0,
              cicdProviders: 0,
            },
          },
        };
      }
    } catch (userError) {
      console.error(`[@action:team:getTeamDetails] Error getting user:`, userError);
      return {
        success: true,
        data: {
          team: null,
          memberCount: 0,
          userRole: null,
          resourceCounts: {
            repositories: 0,
            deployments: 0,
            cicdProviders: 0,
          },
        },
      };
    }

    // Get user's teams
    let teams;
    try {
      const cookieStore = await cookies();
      teams = await dbGetUserTeams(user.id, cookieStore);
      if (!teams.success || !teams.data || teams.data.length === 0) {
        console.log(`[@action:team:getTeamDetails] No teams found for user: ${user.id}`);
        return {
          success: true,
          data: {
            team: null,
            memberCount: 0,
            userRole: null,
            resourceCounts: {
              repositories: 0,
              deployments: 0,
              cicdProviders: 0,
            },
          },
        };
      }
    } catch (teamsError) {
      console.error(`[@action:team:getTeamDetails] Error getting user teams:`, teamsError);
      return {
        success: true,
        data: {
          team: null,
          memberCount: 0,
          userRole: null,
          resourceCounts: {
            repositories: 0,
            deployments: 0,
            cicdProviders: 0,
          },
        },
      };
    }

    // Get active team
    let activeTeam;
    try {
      const cookieStore = await cookies();
      // Pass the already retrieved teams to avoid duplicate getUserTeams calls
      const activeTeamResult = await dbGetUserActiveTeam(user.id, cookieStore, teams.data);
      if (activeTeamResult.success && activeTeamResult.data) {
        activeTeam = activeTeamResult.data;
      } else {
        activeTeam = teams.data[0]; // Default to first team
      }
    } catch (activeTeamError) {
      console.error(`[@action:team:getTeamDetails] Error getting active team:`, activeTeamError);
      activeTeam = teams.data[0]; // Default to first team
    }

    // Get members and user role
    let members: TeamMember[] = [];
    let userRole = null;
    try {
      const cookieStore = await cookies();
      const membersResult = await teamMemberDb.getTeamMembers(activeTeam.id, cookieStore);

      if (membersResult.success && membersResult.data) {
        members = membersResult.data;
        const userMember = members.find((m: TeamMember) => m.profile_id === user.id);
        userRole = userMember ? userMember.role : null;
      }
    } catch (membersError) {
      console.error(`[@action:team:getTeamDetails] Error getting team members:`, membersError);
    }

    // Get resource counts
    let resourceCounts = {
      repositories: 0,
      deployments: 0,
      cicdProviders: 0,
    };
    try {
      const countsResult = await getTenantResourceCounts(activeTeam.tenant_id);
      if (countsResult.success && countsResult.data) {
        resourceCounts = countsResult.data;
      }
    } catch (countsError) {
      console.error(`[@action:team:getTeamDetails] Error getting resource counts:`, countsError);
    }

    console.log(`[@action:team:getTeamDetails] Successfully retrieved team details`);
    return {
      success: true,
      data: {
        team: activeTeam,
        memberCount: members.length,
        userRole,
        resourceCounts,
      },
    };
  } catch (error: any) {
    console.error(`[@action:team:getTeamDetails] Error:`, error);
    return {
      success: false,
      error: error.message || 'Failed to get team details',
    };
  }
});

/**
 * Gets resources that aren't assigned to any team but are
 * linked to the user's providers
 */
export const getUnassignedResources = cache(async () => {
  try {
    console.log(`[@action:team:getUnassignedResources] Getting unassigned resources`);
    const user = await getUser();
    if (!user) {
      console.log(`[@action:team:getUnassignedResources] No user found, returning empty list`);
      return { repositories: [] };
    }

    // TODO: Implement this in DB layer when available
    console.log(
      '[@action:team:getUnassignedResources] Not fully implemented, returning empty repository list',
    );
    return { repositories: [] };
  } catch (error) {
    console.error(
      '[@action:team:getUnassignedResources] Error fetching unassigned resources:',
      error,
    );
    throw new Error('Failed to fetch unassigned resources');
  }
});

/**
 * Assigns a resource to a team and sets the creator
 */
export const assignResourceToTeam = cache(
  async (resourceId: string, resourceType: string, teamId: string) => {
    try {
      console.log(
        `[@action:team:assignResourceToTeam] Assigning resource: ${resourceId} of type: ${resourceType} to team: ${teamId}`,
      );
      const user = await getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // TODO: Implement this in DB layer when available
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Basic implementation: update the team_id field of the resource
      // This needs to be adapted based on the actual table names and structures
      let result;

      if (resourceType === 'repository') {
        result = await supabase
          .from('repositories')
          .update({ team_id: teamId })
          .eq('id', resourceId);
      } else if (resourceType === 'host') {
        result = await supabase.from('hosts').update({ team_id: teamId }).eq('id', resourceId);
      } else if (resourceType === 'deployment') {
        result = await supabase
          .from('deployments')
          .update({ team_id: teamId })
          .eq('id', resourceId);
      } else {
        throw new Error(`Unsupported resource type: ${resourceType}`);
      }

      if (result?.error) {
        throw new Error(result.error.message);
      }

      console.info('[@action:team:assignResourceToTeam] Resource assigned to team', {
        resourceId,
        resourceType,
        teamId,
        userId: user.id,
      });

      return { success: true };
    } catch (error) {
      console.error('[@action:team:assignResourceToTeam] Error assigning resource to team', error);
      throw new Error('Failed to assign resource to team');
    }
  },
);

/**
 * Get resource counts for a tenant
 */
export const getTenantResourceCounts = cache(async (tenantId: string) => {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Get repository count
    const { count: repositories } = await supabase
      .from('repositories')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Get deployment count
    const { count: deployments } = await supabase
      .from('deployments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Get cicd provider count
    const { count: cicdProviders } = await supabase
      .from('cicd_providers')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    console.log(`[@action:team:getTenantResourceCounts] Successfully got resource counts`);
    return {
      success: true,
      data: {
        repositories: repositories || 0,
        deployments: deployments || 0,
        cicdProviders: cicdProviders || 0,
      },
    };
  } catch (error: any) {
    console.error(`[@action:team:getTenantResourceCounts] Error:`, error);
    return {
      success: false,
      error: error.message || 'Failed to get resource counts',
    };
  }
});
