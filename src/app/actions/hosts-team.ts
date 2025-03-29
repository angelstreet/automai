'use server';

import { cookies } from 'next/headers';

import type { Host } from '@/app/[locale]/[tenant]/hosts/types';
import { getUser } from '@/app/actions/user';
import { hostTeamIntegration } from '@/lib/supabase/db-hosts';
import { checkResourceLimit } from '@/lib/supabase/db-teams';

import type { ActionResult } from '@/lib/types';

/**
 * Get all hosts for a specific team
 * @param teamId Team ID to filter hosts by
 * @returns Action result containing hosts or error
 */
export async function getHostsByTeam(teamId: string): Promise<ActionResult<Host[]>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await hostTeamIntegration.getHostsByTeam(teamId, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch hosts by team' };
  }
}

/**
 * Create a host with team association, respecting resource limits
 * @param hostData Host data to create
 * @param teamId Team ID to associate the host with
 * @returns Action result containing created host or error
 */
export async function createHostWithTeam(
  hostData: Omit<Host, 'id' | 'created_at' | 'updated_at'>,
  teamId: string,
): Promise<ActionResult<Host>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check resource limits
    const cookieStore = cookies();
    const limitResult = await checkResourceLimit(user.tenant_id, 'hosts', cookieStore);

    if (!limitResult.success) {
      return { success: false, error: limitResult.error };
    }

    if (!limitResult.data.canCreate) {
      return {
        success: false,
        error: `Host limit reached (${limitResult.data.current}/${limitResult.data.limit}). Please upgrade your subscription.`,
      };
    }

    // Create host with team association
    const result = await hostTeamIntegration.createHostWithTeam(
      {
        ...hostData,
        tenant_id: user.tenant_id,
      },
      teamId,
      cookieStore,
    );

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create host' };
  }
}

/**
 * Update a host's team association
 * @param hostId Host ID to update
 * @param teamId Team ID to associate the host with
 * @returns Action result containing updated host or error
 */
export async function updateHostTeam(hostId: string, teamId: string): Promise<ActionResult<Host>> {
  try {
    const user = await getUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = cookies();
    const result = await hostTeamIntegration.updateHostTeam(hostId, teamId, cookieStore);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update host team' };
  }
}
