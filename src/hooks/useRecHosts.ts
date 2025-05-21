'use client';

import { useCallback, useEffect, useState } from 'react';

import { getHostsWithVNCData, revalidateRecData } from '@/app/actions/recAction';
import { Host } from '@/types/component/hostComponentType';

export interface UseRecHostsReturn {
  hosts: Host[];
  loading: boolean;
  error: string | null;
  refreshHosts: () => Promise<void>;
}

/**
 * Hook for managing hosts with VNC data in the rec feature
 */
export function useRecHosts(): UseRecHostsReturn {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch hosts on mount
  const fetchHosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getHostsWithVNCData();

      if (result.success && result.data) {
        // Filter hosts that have IP set (required for VNC)
        const hostsWithVNCData = result.data.filter((host) => host.ip);
        setHosts(hostsWithVNCData);
      } else {
        setError(result.error || 'Failed to fetch hosts');
        setHosts([]);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setHosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh hosts (can be called manually)
  const refreshHosts = useCallback(async () => {
    try {
      await revalidateRecData();
      await fetchHosts();
    } catch (err: any) {
      setError(err.message || 'Failed to refresh hosts');
    }
  }, [fetchHosts]);

  // Initial fetch
  useEffect(() => {
    fetchHosts();

    // Create event listener for host changes
    const handleHostsChange = () => {
      fetchHosts();
    };

    // Listen for host changes from other parts of the app
    window.addEventListener('HOSTS_UPDATED', handleHostsChange);

    return () => {
      window.removeEventListener('HOSTS_UPDATED', handleHostsChange);
    };
  }, [fetchHosts]);

  return { hosts, loading, error, refreshHosts };
}
