'use server';

import { cookies } from 'next/headers';
import { getUser } from '@/app/actions/user';
import { repositoryTeamIntegration } from '@/lib/supabase/db-repositories';
import { checkResourceLimit } from '@/lib/supabase/db-teams';
import type { ActionResult } from '@/lib/types';
import type { Repository } from '@/types/context/repository';

/**
 * Get all repositories for a specific team
 * @param teamId Team ID to filter repositories by
 * @returns Action result containing repositories or error
 */
export async function getRepositoriesByTeam(teamId: string): Promise<ActionResult<Repository[]>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await repositoryTeamIntegration.getRepositoriesByTeam(teamId, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch repositories by team' };
  }
}

/**
 * Create a repository with team association, respecting resource limits
 * @param repoData Repository data to create
 * @param teamId Team ID to associate the repository with
 * @returns Action result containing created repository or error
 */
export async function createRepositoryWithTeam(
  repoData: Omit<Repository, 'id' | 'created_at' | 'updated_at'>,
  teamId: string,
): Promise<ActionResult<Repository>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check resource limits
    const cookieStore = cookies();
    const limitResult = await checkResourceLimit(user.tenant_id, 'repositories', cookieStore);

    if (!limitResult.success) {
      return { success: false, error: limitResult.error };
    }

    if (!limitResult.data.canCreate) {
      return {
        success: false,
        error: `Repository limit reached (${limitResult.data.current}/${limitResult.data.limit}). Please upgrade your subscription.`,
      };
    }

    // Create repository with team association
    const result = await repositoryTeamIntegration.createRepositoryWithTeam(
      {
        ...repoData,
        tenant_id: user.tenant_id,
      },
      teamId,
      cookieStore,
    );

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create repository' };
  }
}

/**
 * Update a repository's team association
 * @param repoId Repository ID to update
 * @param teamId Team ID to associate the repository with
 * @returns Action result containing updated repository or error
 */
export async function updateRepositoryTeam(
  repoId: string,
  teamId: string,
): Promise<ActionResult<Repository>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await repositoryTeamIntegration.updateRepositoryTeam(
      repoId,
      teamId,
      cookieStore,
    );

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update repository team' };
  }
}
