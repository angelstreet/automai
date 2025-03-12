'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { Host } from '../types';
import { getHosts, createHost, deleteHost as deleteHostAction, testHostConnection as testHostConnectionAction } from '@/app/actions/hosts';
import useSWR from 'swr';

// Local storage key for hosts cache
const HOSTS_CACHE_KEY = 'hosts-cache';

// Helper to get cached hosts
const getCachedHosts = (): Host[] => {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(HOSTS_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (e) {
    return [];
  }
};

// Helper to set cached hosts
const setCachedHosts = (hosts: Host[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HOSTS_CACHE_KEY, JSON.stringify(hosts));
  } catch (e) {
    console.error('Failed to cache hosts:', e);
  }
};

export function useHosts() {
  const { toast } = useToast();

  // Fetch hosts with SWR
  const {
    data: hosts = [],
    isLoading,
    mutate,
  } = useSWR<Host[]>('hosts', async () => {
    try {
      const result = await getHosts();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch hosts');
      }
      // Update cache when we get new data
      setCachedHosts(result.data || []);
      return result.data || [];
    } catch (error) {
      console.error('Error fetching hosts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch hosts',
        variant: 'destructive',
      });
      return [];
    }
  }, {
    fallbackData: getCachedHosts(), // Use cached data while loading
    revalidateOnFocus: false, // Don't revalidate on window focus
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
  });

  const addHost = useCallback(
    async (hostData: Omit<Host, 'id'>) => {
      try {
        const result = await createHost(hostData);

        if (!result.success) {
          toast({
            title: 'Error',
            description: result.error || 'Failed to create host',
            variant: 'destructive',
          });
          return null;
        }

        // Update the SWR cache with the new host
        await mutate(async (currentHosts: Host[] = []) => {
          if (!result.data) return currentHosts;
          const updatedHosts = [...currentHosts, result.data];
          setCachedHosts(updatedHosts);
          return updatedHosts;
        }, false);

        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create host';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return null;
      }
    },
    [toast, mutate],
  );

  // Delete host functionality
  const deleteHost = useCallback(
    async (id: string) => {
      try {
        const result = await deleteHostAction(id);

        if (!result.success) {
          toast({
            title: 'Error',
            description: result.error || 'Failed to delete host',
            variant: 'destructive',
          });
          return false;
        }

        // Update the SWR cache to remove the deleted host
        await mutate(
          async (currentHosts: Host[] = []) => {
            const updatedHosts = currentHosts.filter(host => host.id !== id);
            setCachedHosts(updatedHosts);
            return updatedHosts;
          },
          false
        );

        toast({
          title: 'Success',
          description: 'Host deleted successfully',
        });

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete host';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast, mutate]
  );

  // Test connection functionality
  const testConnection = useCallback(
    async (id: string) => {
      try {
        const result = await testHostConnectionAction(id);

        if (!result.success) {
          toast({
            title: 'Error',
            description: result.error || 'Failed to test connection',
            variant: 'destructive',
          });
          
          // Update the host status in the cache
          await mutate(
            async (currentHosts: Host[] = []) => {
              const updatedHosts = currentHosts.map(host => {
                if (host.id === id) {
                  return {
                    ...host,
                    status: 'failed' as const,
                  };
                }
                return host;
              });
              setCachedHosts(updatedHosts);
              return updatedHosts;
            },
            false
          );
          
          return false;
        }

        // Update the host status in the cache
        await mutate(
          async (currentHosts: Host[] = []) => {
            const updatedHosts = currentHosts.map(host => {
              if (host.id === id) {
                return {
                  ...host,
                  status: 'connected' as const,
                };
              }
              return host;
            });
            setCachedHosts(updatedHosts);
            return updatedHosts;
          },
          false
        );

        toast({
          title: 'Success',
          description: result.message || 'Connection test successful',
        });
        
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to test connection';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast, mutate]
  );

  return {
    hosts,
    loading: isLoading,
    error: null,
    fetchHosts: mutate,
    addHost,
    deleteHost,
    testConnection,
    isLoaded: !isLoading && hosts !== null,
  };
} 