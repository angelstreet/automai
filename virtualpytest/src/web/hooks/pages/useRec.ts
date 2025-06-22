import { useState, useEffect, useCallback } from 'react';
import { Host } from '../../types/common/Host_Types';

interface UseRecReturn {
  hosts: Host[];
  isLoading: boolean;
  error: string | null;
  refreshHosts: () => Promise<void>;
  takeScreenshot: (host: Host) => Promise<string | null>;
}

export const useRec = (): UseRecReturn => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all connected hosts and filter for AV capabilities
  const fetchHosts = useCallback(async () => {
    try {
      console.log('[@hook:useRec] Fetching connected hosts with AV capabilities');

      const response = await fetch('/server/system/getAllHosts');
      if (!response.ok) {
        throw new Error(`Failed to fetch hosts: ${response.status}`);
      }

      const data = await response.json();

      console.log('[@hook:useRec] Raw response from server:', data);

      if (!data.success || !data.hosts) {
        throw new Error(data.error || 'Invalid response format');
      }

      console.log('[@hook:useRec] All hosts received:', data.hosts);
      console.log('[@hook:useRec] First host details:', data.hosts[0]);

      // Filter hosts that have AV capabilities and are online
      const avHosts = data.hosts.filter((host: Host) => {
        console.log(`[@hook:useRec] Checking host ${host.host_name}:`, {
          status: host.status,
          capabilities: host.capabilities,
          hasAV: host.capabilities && host.capabilities.includes('av'),
        });

        return host.status === 'online' && host.capabilities && host.capabilities.includes('av');
      });

      console.log(
        `[@hook:useRec] Found ${avHosts.length} hosts with AV capabilities out of ${data.hosts.length} total hosts`,
      );
      console.log('[@hook:useRec] AV hosts:', avHosts);
      setHosts(avHosts);
      setError(null);
    } catch (err: any) {
      console.error('[@hook:useRec] Error fetching hosts:', err);
      setError(err.message || 'Failed to fetch hosts');
      setHosts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Take screenshot for a specific host
  const takeScreenshot = useCallback(async (host: Host): Promise<string | null> => {
    try {
      console.log(`[@hook:useRec] Taking screenshot for host: ${host.host_name}`);

      const response = await fetch('/server/av/take-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ host }),
      });

      if (!response.ok) {
        throw new Error(`Screenshot failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.screenshot_url) {
        console.log(
          `[@hook:useRec] Screenshot taken for ${host.host_name}: ${result.screenshot_url}`,
        );
        return result.screenshot_url;
      } else {
        console.error(`[@hook:useRec] Screenshot failed for ${host.host_name}:`, result.error);
        return null;
      }
    } catch (err: any) {
      console.error(`[@hook:useRec] Error taking screenshot for ${host.host_name}:`, err);
      return null;
    }
  }, []);

  // Refresh hosts function
  const refreshHosts = useCallback(async () => {
    await fetchHosts();
  }, [fetchHosts]);

  // Initial fetch
  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  return {
    hosts,
    isLoading,
    error,
    refreshHosts,
    takeScreenshot,
  };
};
