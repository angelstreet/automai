'use server';

import { cookies } from 'next/headers';

import { getUser } from '@/app/actions/user';
import { cicdTeamIntegration } from '@/lib/supabase/db-cicd';
import { checkResourceLimit } from '@/lib/supabase/db-teams';
import type { CICDProvider } from '@/types/context/cicd';

import type { ActionResult } from '@/lib/types';

/**
 * Get all CICD providers for a specific team
 * @param teamId Team ID to filter CICD providers by
 * @returns Action result containing CICD providers or error
 */
export async function getCICDProvidersByTeam(
  teamId: string,
): Promise<ActionResult<CICDProvider[]>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await cicdTeamIntegration.getCICDProvidersByTeam(teamId, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch CICD providers by team' };
  }
}

/**
 * Create a CICD provider with team association, respecting resource limits
 * @param providerData CICD provider data to create
 * @param teamId Team ID to associate the CICD provider with
 * @returns Action result containing created CICD provider or error
 */
export async function createCICDProviderWithTeam(
  providerData: Omit<CICDProvider, 'id' | 'created_at' | 'updated_at'>,
  teamId: string,
): Promise<ActionResult<CICDProvider>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check resource limits
    const cookieStore = cookies();
    const limitResult = await checkResourceLimit(user.tenant_id, 'cicd_providers', cookieStore);

    if (!limitResult.success) {
      return { success: false, error: limitResult.error };
    }

    if (!limitResult.data.canCreate) {
      return {
        success: false,
        error: `CICD provider limit reached (${limitResult.data.current}/${limitResult.data.limit}). Please upgrade your subscription.`,
      };
    }

    // Create CICD provider with team association
    const result = await cicdTeamIntegration.createCICDProviderWithTeam(
      {
        ...providerData,
        tenant_id: user.tenant_id,
      },
      teamId,
      cookieStore,
    );

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create CICD provider' };
  }
}

/**
 * Update a CICD provider's team association
 * @param providerId CICD provider ID to update
 * @param teamId Team ID to associate the CICD provider with
 * @returns Action result containing updated CICD provider or error
 */
export async function updateCICDProviderTeam(
  providerId: string,
  teamId: string,
): Promise<ActionResult<CICDProvider>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await cicdTeamIntegration.updateCICDProviderTeam(
      providerId,
      teamId,
      cookieStore,
    );

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update CICD provider team' };
  }
}
