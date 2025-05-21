'use server';

import { revalidatePath } from 'next/cache';
import { cache } from 'react';

import { getUserActiveTeam } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import hostDb from '@/lib/db/hostDb';
import { Host } from '@/types/component/hostComponentType';

/**
 * Gets all hosts with VNC data for the rec feature
 * This is similar to getHosts but focuses on VNC-specific data
 */
export const getHostsWithVNCData = cache(
  async (): Promise<{ success: boolean; error?: string; data?: Host[] }> => {
    try {
      console.log('[@action:rec:getHostsWithVNCData] Starting to fetch hosts with VNC data');

      // Get current user and team
      const user = await getUser();
      const activeTeamResult = await getUserActiveTeam(user?.id ?? '');
      if (!activeTeamResult?.id) {
        return { success: false, error: 'No active team found' };
      }

      // Fetch hosts for team
      const result = await hostDb.getHosts(activeTeamResult.id);
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to fetch hosts' };
      }

      // Return all hosts - VNC filtering can be done on the client side if needed
      console.log(
        `[@action:rec:getHostsWithVNCData] Successfully fetched ${result.data.length} hosts`,
      );
      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('[@action:rec:getHostsWithVNCData] Error:', error);
      return { success: false, error: error.message || 'Failed to fetch hosts with VNC data' };
    }
  },
);

/**
 * Revalidates rec data
 */
export async function revalidateRecData(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[@action:rec:revalidateRecData] Revalidating rec data');
    revalidatePath('/[locale]/[tenant]/rec', 'page');
    return { success: true };
  } catch (error: any) {
    console.error('[@action:rec:revalidateRecData] Error:', error);
    return { success: false, error: error.message || 'Failed to revalidate rec data' };
  }
}
