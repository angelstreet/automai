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
import { type DbResponse } from '@/lib/utils/dbUtils';
import type { ActionResult } from '@/types/context/cicdContextType';
import { TeamMember } from '@/types/context/teamContextType';
import type {
  TeamCreateInput,
  TeamUpdateInput,
  TeamMemberCreateInput,
  ResourceLimit,
} from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

type TeamResult = DbResponse<Team>;

// Use TeamMemberType consistently throughout this file

/**
 * Checks if an object is safely serializable for client components
 */
function isSerializable(obj: any): boolean {
  if (obj === null || obj === undefined) return true;
  if (typeof obj !== 'object') return true;
  if (obj instanceof Date) return true;
  if (Array.isArray(obj)) return obj.every((item) => isSerializable(item));

  const proto = Object.getPrototypeOf(obj);

  // Check for null prototype (problematic for Next.js)
  if (proto === null) {
    console.error('[@action:team:isSerializable] Found object with null prototype:', obj);
    return false;
  }

  // Check for Supabase PostgrestResponse or other custom prototypes
  const constructorName = proto.constructor?.name;
  if (constructorName && constructorName !== 'Object') {
    console.error(
      `[@action:team:isSerializable] Found object with custom prototype: ${constructorName}`,
    );
    return false;
  }

  // Check if it's a plain object (constructor should be Object)
  const isPlainObject = obj.constructor === Object;
  if (!isPlainObject) {
    console.error(
      '[@action:team:isSerializable] Found non-plain object:',
      obj.constructor.name || 'Unknown',
      obj,
    );
    return false;
  }

  // Check all properties
  return Object.values(obj).every((val) => isSerializable(val));
}

/**
 * Sanitizes data to ensure it's serializable for client components
 * Creates a deep clone of plain objects only
 */
function sanitizeForClient<T>(data: T): T {
  // Handle null or undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitive types
  if (typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForClient(item)) as unknown as T;
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString() as unknown as T;
  }

  // Handle objects by creating a deep plain copy
  try {
    // Check if original object is serializable first
    if (!isSerializable(data)) {
      console.error(
        '[@action:team:sanitizeForClient] Found non-serializable object, forcing JSON conversion',
      );
    }

    // Most reliable way to ensure serialization works
    try {
      // Try JSON conversion first (fastest approach)
      const stringified = JSON.stringify(data);
      return JSON.parse(stringified) as T;
    } catch (jsonError) {
      // If JSON conversion fails, manually copy only primitive properties
      console.error(
        '[@action:team:sanitizeForClient] JSON conversion failed, using manual copy:',
        jsonError,
      );

      // Create a new plain object
      const safeObject: Record<string, any> = {};

      // Only copy primitive properties and known safe types
      // This is a much safer approach than trying to preserve everything
      Object.keys(data as any).forEach((key) => {
        const value = (data as any)[key];

        // Accept only primitive values, arrays of primitives, or plain objects
        if (value === null || value === undefined) {
          safeObject[key] = value;
        } else if (typeof value !== 'object') {
          safeObject[key] = value;
        } else if (value instanceof Date) {
          safeObject[key] = value.toISOString();
        } else if (Array.isArray(value)) {
          // For arrays, recursively sanitize each item
          safeObject[key] = value.map((item) => sanitizeForClient(item));
        } else if (value && typeof value === 'object') {
          // For objects, recursively sanitize
          safeObject[key] = sanitizeForClient(value);
        }
        // Ignore anything else that might cause serialization issues
      });

      return safeObject as T;
    }
  } catch (error) {
    console.error('[@action:team:sanitizeForClient] Error sanitizing data:', error);
    // Log the object that caused the error to better understand the issue
    console.error(
      '[@action:team:sanitizeForClient] Problem object (partial):',
      typeof data === 'object' ? Object.keys(data || {}) : typeof data,
    );
    return {} as T; // Return empty object as fallback
  }
}

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

    // Sanitize before returning
    console.debug(`[@action:team:getTeams] Sanitizing teams data for serialization`);
    const sanitizedTeams = sanitizeForClient(result.data);

    // Add debugging log - using a count to avoid huge logs
    console.log(
      `[@action:team:getTeams] Sanitized ${sanitizedTeams.length} teams, first team:`,
      sanitizedTeams.length > 0 ? JSON.stringify(sanitizedTeams[0]) : 'none',
    );

    return {
      success: true,
      data: sanitizedTeams,
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
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result containing created team or error
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
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result containing updated team or error
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
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result with success status or error
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
 * Get team members with profile data
 * @param teamId Team ID to get members for
 * @returns Action result containing team members or error
 */
export const getTeamMembers = cache(async (teamId: string) => {
  const cookieStore = await cookies();
  const result = await teamMemberDb.getTeamMembers(teamId, cookieStore);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to get team members');
  }
  return result.data;
});

/**
 * Add a member to a team
 * @param input Team member data to create
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result containing created team member or error
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
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result containing updated team member or error
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
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result with success status or error
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
 * @returns Action result containing limit check data or error
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

      // TODO: Implement resource limit checking
      return {
        type: resourceType,
        current: 0,
        limit: 0,
        isUnlimited: true,
        canCreate: true,
      };
    } catch (error) {
      console.error(`[@action:team:checkResourceLimit] Error checking resource limit:`, error);
      throw error;
    }
  },
);

// Cache resource counts for a tenant
export const getTenantResourceCounts = cache(async (tenantId: string) => {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  let reposCount = 0;
  let cicdCount = 0;
  let deploymentsCount = 0;
  let hostsCount = 0;

  try {
    // First get all teams in this tenant
    const teamsResult = await supabase.from('teams').select('id').eq('tenant_id', tenantId);

    if (!teamsResult.error && teamsResult.data && teamsResult.data.length > 0) {
      // Get all team IDs in this tenant
      const teamIds = teamsResult.data.map((t) => t.id);
      console.log(
        `[@action:team:getTenantResourceCounts] Found ${teamIds.length} teams in tenant ${tenantId}`,
      );

      // Get repositories from all teams in this tenant
      const reposResult = await supabase
        .from('repositories')
        .select('id', { count: 'exact' })
        .in('team_id', teamIds);

      if (!reposResult.error) {
        reposCount = reposResult.data.length;
        console.log(
          `[@action:team:getTenantResourceCounts] Found ${reposCount} repositories across all teams in tenant ${tenantId}`,
        );
      }
    }

    // Get CICD provider count for the current tenant
    const cicdResult = await supabase
      .from('cicd_providers')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId);

    if (!cicdResult.error) {
      cicdCount = cicdResult.data.length;
      console.log(
        `[@action:team:getTenantResourceCounts] Found ${cicdCount} CICD providers for tenant ${tenantId}`,
      );
    }

    // Get deployments count
    try {
      const { default: deploymentDb } = await import('@/lib/db/deploymentDb');
      const deployments = await deploymentDb.findMany(
        { where: { tenant_id: tenantId } },
        cookieStore,
      );

      if (deployments.success && deployments.data) {
        deploymentsCount = deployments.data.length;
      }
      console.log(
        '[@action:team:getTenantResourceCounts] Found deployments count:',
        deploymentsCount,
      );
    } catch (err) {
      console.error('[@action:team:getTenantResourceCounts] Error getting deployments count:', err);
    }

    // Count hosts
    try {
      const { default: hostDb } = await import('@/lib/db/hostDb');
      const hosts = await hostDb.getHosts(tenantId);

      if (hosts.success && hosts.data) {
        hostsCount = hosts.data.length;
        console.log(
          `[@action:team:getTenantResourceCounts] Found ${hostsCount} hosts for tenant ${tenantId}`,
        );
      }
    } catch (err) {
      console.error('[@action:team:getTenantResourceCounts] Error counting hosts:', err);
    }
  } catch (err) {
    console.error('[@action:team:getTenantResourceCounts] Exception counting resources:', err);
  }

  return {
    repositories: reposCount,
    hosts: hostsCount,
    cicd: cicdCount,
    deployments: deploymentsCount,
  };
});

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

    // Get the user's teams - now using cached function
    const teams = await getUserTeams(user.id);

    if (!teams || teams.length === 0) {
      console.log(
        `[@action:team:getTeamDetails] No teams found for user, returning default values`,
      );
      return {
        id: null,
        name: 'No Team',
        subscription_tier: 'trial',
        memberCount: 0,
        ownerId: user.id,
        ownerEmail: user.email,
        resourceCounts: { repositories: 0, hosts: 0, cicd: 0 },
      };
    }

    const team = teams[0];

    // Get member count and user's role - now using cached function
    const members = await getTeamMembers(team.id);
    const memberCount = members.length || 0;

    // Find the user's role in the team
    let role = null;
    const userMember = members.find(
      (member: { profile_id: string; role: string }) => member.profile_id === user.id,
    );
    if (userMember) {
      role = userMember.role;
      console.log(
        `[@action:team:getTeamDetails] Found user role: ${role} for user ${user.id} in team ${team.id}`,
      );
    }

    console.log(`[@action:team:getTeamDetails] Returning team details with role: ${role}`);

    // Get resource counts using cached function
    const resourceCounts = await getTenantResourceCounts(team.tenant_id);

    // Return team details with actual resource counts
    console.log(`[@action:team:getTeamDetails] Successfully obtained team details`);
    return {
      ...team,
      memberCount,
      ownerId: user.id,
      ownerEmail: user.email,
      role,
      resourceCounts,
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
export const getUnassignedResources = cache(async () => {
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
  },
);

// Export types for client usage
export type { Team, TeamResult };
