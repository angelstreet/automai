'use server';

import { getUser } from '@/app/actions/user';
import {
  getTeams as dbGetTeams,
  getTeam as dbGetTeam,
  createTeam as dbCreateTeam,
  updateTeam as dbUpdateTeam,
  deleteTeam as dbDeleteTeam,
  getTeamMembers as dbGetTeamMembers,
  addTeamMember as dbAddTeamMember,
  updateTeamMemberRole as dbUpdateTeamMemberRole,
  removeTeamMember as dbRemoveTeamMember,
  checkResourceLimit as dbCheckResourceLimit,
} from '@/lib/supabase/db-teams';
import type { ActionResult } from '@/types/context/cicd';
import type {
  Team,
  TeamCreateInput,
  TeamUpdateInput,
  TeamMember,
  TeamMemberCreateInput,
  ResourceLimit,
} from '@/types/context/team';
import { cache } from 'react';
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

    const result = await dbGetTeams(user.tenant_id);

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

      const result = await dbGetTeam(teamId);

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

    const result = await dbCreateTeam({ ...input, tenant_id: user.tenant_id });

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

    const result = await dbUpdateTeam(teamId, input);

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

    const result = await dbDeleteTeam(teamId);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete team' };
  }
}

/**
 * Get members of a team
 * @param teamId Team ID to get members for
 * @param providedUser Optional user object to avoid redundant getUser calls
 * @returns Action result containing team members or error
 */
export const getTeamMembers = cache(
  async (teamId: string, providedUser?: User | null): Promise<ActionResult<TeamMember[]>> => {
    try {
      const user = providedUser || (await getUser());
      if (!user || !user.tenant_id) {
        return { success: false, error: 'Unauthorized' };
      }

      const result = await dbGetTeamMembers(teamId);

      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch team members' };
    }
  },
);

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

    const result = await dbAddTeamMember(input);

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

    const result = await dbUpdateTeamMemberRole(teamId, profileId, role);

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

    const result = await dbRemoveTeamMember(teamId, profileId);

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

      if (result.success && result.data) {
        return {
          success: true,
          data: {
            type: resourceType,
            current: result.data.current,
            limit: result.data.limit,
            isUnlimited: result.data.isUnlimited,
            canCreate: result.data.canCreate,
          },
        };
      }

      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to check resource limit' };
    }
  },
);
