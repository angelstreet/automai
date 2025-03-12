'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { Host } from './types';
import {
  getHost,
  getHosts,
  updateHost,
  createHost,
  deleteHost as deleteHostAction,
  testHostConnection as testHostConnectionAction,
} from './actions';
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
        // First update the host to testing state
        await mutate(
          async (currentHosts: Host[] = []) => {
            const updatedHosts = currentHosts.map(host => {
              if (host.id === id) {
                return {
                  ...host,
                  status: 'testing' as const,
                };
              }
              return host;
            });
            setCachedHosts(updatedHosts);
            return updatedHosts;
          },
          false
        );
        
        // Small delay to show the testing state animation
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        // Now perform the actual connection test
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
        
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to test connection';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        
        // Make sure to update the host status to failed in case of error
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
    },
    [toast, mutate]
  );

  // Test all connections functionality
  const testAllConnections = useCallback(
    async () => {
      try {
        // Get current hosts from cache
        const currentHosts = [...hosts];
        let successCount = 0;
        
        // Test each host sequentially
        for (const host of currentHosts) {
          // First update the host to testing state
          await mutate(
            async (currentHosts: Host[] = []) => {
              const updatedHosts = currentHosts.map(h => {
                if (h.id === host.id) {
                  return {
                    ...h,
                    status: 'testing' as const,
                  };
                }
                return h;
              });
              setCachedHosts(updatedHosts);
              return updatedHosts;
            },
            false
          );
          
          // Small delay to show the testing state animation
          await new Promise((resolve) => setTimeout(resolve, 300));
          
          // Now perform the actual connection test
          try {
            const result = await testHostConnectionAction(host.id);
            
            // Update the host status in the cache based on the result
            await mutate(
              async (currentHosts: Host[] = []) => {
                const updatedHosts = currentHosts.map(h => {
                  if (h.id === host.id) {
                    return {
                      ...h,
                      status: result.success ? 'connected' as const : 'failed' as const,
                    };
                  }
                  return h;
                });
                setCachedHosts(updatedHosts);
                return updatedHosts;
              },
              false
            );
            
            if (result.success) {
              successCount++;
            }
            
            // Small delay between hosts
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (error) {
            // Update the host status to failed in case of error
            await mutate(
              async (currentHosts: Host[] = []) => {
                const updatedHosts = currentHosts.map(h => {
                  if (h.id === host.id) {
                    return {
                      ...h,
                      status: 'failed' as const,
                    };
                  }
                  return h;
                });
                setCachedHosts(updatedHosts);
                return updatedHosts;
              },
              false
            );
          }
        }
        
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to test all connections';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return false;
      }
    },
    [hosts, toast, mutate]
  );

  return {
    hosts,
    loading: isLoading,
    error: null,
    fetchHosts: mutate,
    addHost,
    deleteHost,
    testConnection,
    testAllConnections,
    isLoaded: !isLoading && hosts !== null,
  };
}

export function useHost(initialHostId?: string) {
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(initialHostId ? true : false);
  const [error, setError] = useState<Error | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const fetchHost = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);

        const result = await getHost(id);

        if (!result.success) {
          setError(new Error(result.error || 'Failed to fetch host'));
          toast({
            title: 'Error',
            description: result.error || 'Failed to fetch host',
            variant: 'destructive',
          });
          return null;
        }

        setHost(result.data || null);
        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch host';
        setError(err instanceof Error ? err : new Error(errorMessage));
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const updateHostDetails = useCallback(
    async (updates: Partial<Omit<Host, 'id'>>) => {
      if (!host?.id) {
        toast({
          title: 'Error',
          description: 'No host selected',
          variant: 'destructive',
        });
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await updateHost(host.id, updates);

        if (!result.success) {
          setError(new Error(result.error || 'Failed to update host'));
          toast({
            title: 'Error',
            description: result.error || 'Failed to update host',
            variant: 'destructive',
          });
          return null;
        }

        setHost(result.data || null);

        toast({
          title: 'Success',
          description: 'Host updated successfully',
        });

        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update host';
        setError(err instanceof Error ? err : new Error(errorMessage));
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [host, toast],
  );

  const removeHost = useCallback(async () => {
    if (!host?.id) {
      toast({
        title: 'Error',
        description: 'No host selected',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await deleteHostAction(host.id);

      if (!result.success) {
        setError(new Error(result.error || 'Failed to delete host'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete host',
          variant: 'destructive',
        });
        return false;
      }

      setHost(null);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete host';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [host, toast]);

  const testHostConnection = useCallback(async () => {
    if (!host?.id) {
      toast({
        title: 'Error',
        description: 'No host selected',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setIsTesting(true);
      setError(null);

      const result = await testHostConnectionAction(host.id);

      if (!result.success) {
        setError(new Error(result.error || 'Failed to test connection'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to test connection',
          variant: 'destructive',
        });

        // Update host status
        setHost((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'failed',
            errorMessage: result.error,
          };
        });

        return false;
      }

      // Update host status
      setHost((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'connected',
          errorMessage: undefined,
        };
      });

      return true;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test connection';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsTesting(false);
    }
  }, [host, toast]);

  // Fetch host on mount if initialHostId is provided
  useEffect(() => {
    if (initialHostId) {
      fetchHost(initialHostId);
    }
  }, [initialHostId, fetchHost]);

  return {
    host,
    loading,
    error,
    isTesting,
    fetchHost,
    updateHost: updateHostDetails,
    deleteHost: removeHost,
    testConnection: testHostConnection,
    isLoaded: !loading && host !== null,
  };
}

