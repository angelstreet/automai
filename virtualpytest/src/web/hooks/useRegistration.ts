import { useCallback } from 'react';

import { Host } from '../types/common/Host_Types';
import { buildServerUrl } from '../utils/frontendUtils';

/**
 * Registration Hook - Business Logic for Host Management
 *
 * Handles host discovery and selection logic
 */
export const useRegistrationLogic = () => {
  // Fetch hosts from server
  const fetchHosts = useCallback(async (): Promise<{ hosts: Host[]; error: string | null }> => {
    try {
      console.log('[@hook:useRegistration] Starting to fetch hosts from server');

      const fullUrl = buildServerUrl('/server/system/getAllHosts');
      const response = await fetch(fullUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const rawHosts = result.hosts || [];
        console.log(
          `[@hook:useRegistration] Successfully received ${rawHosts.length} hosts from server`,
        );

        return { hosts: rawHosts, error: null };
      } else {
        throw new Error(result.error || 'Server returned success: false');
      }
    } catch (err: any) {
      console.error('[@hook:useRegistration] Error fetching hosts:', err);
      return { hosts: [], error: err.message || 'Failed to fetch hosts' };
    }
  }, []);

  return {
    fetchHosts,
  };
};
