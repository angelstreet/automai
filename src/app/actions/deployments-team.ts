'use server';

import { cookies } from 'next/headers';
import { getUser } from '@/app/actions/user';
import { deploymentTeamIntegration } from '@/lib/supabase/db-deployment';
import { checkResourceLimit } from '@/lib/supabase/db-teams';
import type { ActionResult } from '@/lib/types';
import type { Deployment } from '@/types/context/deployment';

/**
 * Get all deployments for a specific team
 * @param teamId Team ID to filter deployments by
 * @returns Action result containing deployments or error
 */
export async function getDeploymentsByTeam(teamId: string): Promise<ActionResult<Deployment[]>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await deploymentTeamIntegration.getDeploymentsByTeam(teamId, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch deployments by team' };
  }
}

/**
 * Create a deployment with team association, respecting resource limits
 * @param deploymentData Deployment data to create
 * @param teamId Team ID to associate the deployment with
 * @returns Action result containing created deployment or error
 */
export async function createDeploymentWithTeam(
  deploymentData: Omit<Deployment, 'id' | 'created_at' | 'updated_at'>,
  teamId: string,
): Promise<ActionResult<Deployment>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check resource limits
    const cookieStore = cookies();
    const limitResult = await checkResourceLimit(user.tenant_id, 'deployments', cookieStore);

    if (!limitResult.success) {
      return { success: false, error: limitResult.error };
    }

    if (!limitResult.data.canCreate) {
      return {
        success: false,
        error: `Deployment limit reached (${limitResult.data.current}/${limitResult.data.limit}). Please upgrade your subscription.`,
      };
    }

    // Create deployment with team association
    const result = await deploymentTeamIntegration.createDeploymentWithTeam(
      {
        ...deploymentData,
        tenant_id: user.tenant_id,
      },
      teamId,
      cookieStore,
    );

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create deployment' };
  }
}

/**
 * Update a deployment's team association
 * @param deploymentId Deployment ID to update
 * @param teamId Team ID to associate the deployment with
 * @returns Action result containing updated deployment or error
 */
export async function updateDeploymentTeam(
  deploymentId: string,
  teamId: string,
): Promise<ActionResult<Deployment>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await deploymentTeamIntegration.updateDeploymentTeam(
      deploymentId,
      teamId,
      cookieStore,
    );

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update deployment team' };
  }
}
