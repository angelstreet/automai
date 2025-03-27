'use server';

import { cookies } from 'next/headers';
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
import type { ActionResult } from '@/lib/types';
import type {
  Team,
  TeamCreateInput,
  TeamUpdateInput,
  TeamMember,
  TeamMemberCreateInput,
  ResourceLimit,
} from '@/types/context/team';

/**
 * Get all teams for the current user's tenant
 * @returns Action result containing teams or error
 */
export async function getTeams(): Promise<ActionResult<Team[]>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await dbGetTeams(user.tenant_id, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch teams' };
  }
}

/**
 * Get a single team by ID
 * @param teamId Team ID to fetch
 * @returns Action result containing team or error
 */
export async function getTeam(teamId: string): Promise<ActionResult<Team>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await dbGetTeam(teamId, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch team' };
  }
}

/**
 * Create a new team
 * @param input Team data to create
 * @returns Action result containing created team or error
 */
export async function createTeam(input: TeamCreateInput): Promise<ActionResult<Team>> {
  try {
    const user = await getUser();
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
 * @returns Action result containing updated team or error
 */
export async function updateTeam(
  teamId: string,
  input: TeamUpdateInput,
): Promise<ActionResult<Team>> {
  try {
    const user = await getUser();
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
 * @returns Action result with success status or error
 */
export async function deleteTeam(teamId: string): Promise<ActionResult<null>> {
  try {
    const user = await getUser();
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
 * Get members of a team
 * @param teamId Team ID to get members for
 * @returns Action result containing team members or error
 */
export async function getTeamMembers(teamId: string): Promise<ActionResult<TeamMember[]>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await dbGetTeamMembers(teamId, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch team members' };
  }
}

/**
 * Add a member to a team
 * @param input Team member data to create
 * @returns Action result containing created team member or error
 */
export async function addTeamMember(
  input: TeamMemberCreateInput,
): Promise<ActionResult<TeamMember>> {
  try {
    const user = await getUser();
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
 * @returns Action result containing updated team member or error
 */
export async function updateTeamMemberRole(
  teamId: string,
  profileId: string,
  role: string,
): Promise<ActionResult<TeamMember>> {
  try {
    const user = await getUser();
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
 * @returns Action result with success status or error
 */
export async function removeTeamMember(
  teamId: string,
  profileId: string,
): Promise<ActionResult<null>> {
  try {
    const user = await getUser();
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
 * @returns Action result containing limit check data or error
 */
export async function checkResourceLimit(
  resourceType: string,
): Promise<ActionResult<ResourceLimit>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await dbCheckResourceLimit(user.tenant_id, resourceType, cookieStore);

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

    return {
      success: false,
      error: result.error || `Failed to check ${resourceType} limit`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to check resource limit' };
  }
}
