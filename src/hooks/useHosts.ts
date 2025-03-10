'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import useSWR from 'swr';
import { Host } from '@/types/hosts';
import { 
  getHosts, 
  addHost, 
  deleteHost as deleteHostAction, 
  testHostConnection as testConnectionAction,
  testAllHosts,
  updateHost
} from '@/app/actions/hosts';

// Cache keys
const HOSTS_CACHE_KEY = 'automai_hosts_cache';
const HOSTS_CACHE_TIMESTAMP_KEY = 'automai_hosts_cache_timestamp';
// Cache expiry time - 5 minutes (in milliseconds)
const CACHE_EXPIRY_TIME = 5 * 60 * 1000;

// SWR fetcher function that handles errors
const hostsFetcher = async () => {
  console.log('SWR fetcher: Fetching hosts data');
  const result = await getHosts();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch hosts');
  }
  
  console.log(`SWR fetcher: Successfully fetched ${result.data?.length || 0} hosts`);
  return result.data || [];
};

export function useHosts(initialHosts: Host[] = []) {
  // Use SWR for data fetching with proper caching and deduplication
  const { data, error, isLoading: swrLoading, isValidating, mutate } = useSWR<Host[]>(
    'hosts',
    hostsFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000, // 5 seconds between identical requests
      fallbackData: initialHosts,
      onSuccess: (data) => {
        console.log(`SWR: Data updated with ${data.length} hosts`);
        // Update local cache on success
        saveHostsToCache(data);
      },
      onError: (err) => {
        console.error('SWR error fetching hosts:', err);
      }
    }
  );

  // Keep state variables for backwards compatibility
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Use SWR data instead of local state
  const hosts = data || [];

  // Helper function to save hosts to cache
  const saveHostsToCache = useCallback((hostsData: Host[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(HOSTS_CACHE_KEY, JSON.stringify(hostsData));
      localStorage.setItem(HOSTS_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error saving hosts to cache:', error);
    }
  }, []);

  // Helper function to get hosts from cache
  const getHostsFromCache = useCallback((): { hosts: Host[] | null, isFresh: boolean } => {
    if (typeof window === 'undefined') return { hosts: null, isFresh: false };
    
    try {
      const cachedHosts = localStorage.getItem(HOSTS_CACHE_KEY);
      const timestamp = localStorage.getItem(HOSTS_CACHE_TIMESTAMP_KEY);
      
      if (!cachedHosts || !timestamp) {
        return { hosts: null, isFresh: false };
      }
      
      const isFresh = (Date.now() - parseInt(timestamp)) < CACHE_EXPIRY_TIME;
      return { 
        hosts: JSON.parse(cachedHosts) as Host[], 
        isFresh 
      };
    } catch (error) {
      console.error('Error reading hosts from cache:', error);
      return { hosts: null, isFresh: false };
    }
  }, []);

  // We no longer need fetchHosts since SWR handles this
  // This function is kept for backwards compatibility
  const fetchHosts = useCallback(async (forceRefresh = false) => {
    console.log(`fetchHosts called (forceRefresh: ${forceRefresh})`);
    
    try {
      if (forceRefresh) {
        // Use SWR's mutate function to force a refresh
        await mutate();
      }
    } catch (error) {
      console.error('Error in fetchHosts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch hosts',
        variant: 'destructive',
      });
    }
  }, [mutate, toast]);

  const addNewHost = useCallback(async (data: Omit<Host, 'id'>) => {
    try {
      const result = await addHost(data);
      
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add host',
          variant: 'destructive',
        });
        return false;
      }
      
      // Ensure the host has correct status and timestamp
      const host = result.data!;
      const currentTime = new Date();
      
      // Make sure the host has connected status and timestamp
      const processedHost = {
        ...host,
        status: 'connected', // Force connected status
        updated_at: host.updated_at ? new Date(host.updated_at) : currentTime
      };
      
      // Update SWR cache with the new host
      mutate(currentHosts => {
        console.log('Adding new host to SWR cache');
        const newHosts = [...(currentHosts || []), processedHost];
        // Also update local cache
        saveHostsToCache(newHosts);
        return newHosts;
      }, false);
      
      toast({
        title: 'Success',
        description: 'Host added successfully',
      });
      return true;
    } catch (error) {
      console.error('Error adding host:', error);
      toast({
        title: 'Error',
        description: 'Failed to add host',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, mutate, saveHostsToCache]);

  const updateHostDetails = useCallback(async (id: string, updates: Partial<Omit<Host, 'id'>>) => {
    try {
      // Optimistic update
      mutate(
        currentHosts => currentHosts?.map(host => 
          host.id === id ? { ...host, ...updates } : host
        ),
        false
      );
      
      const result = await updateHost(id, updates);
      
      if (!result.success) {
        // Revert changes on failure
        mutate();
        
        toast({
          title: 'Error',
          description: result.error || 'Failed to update host',
          variant: 'destructive',
        });
        return false;
      }
      
      // Update with actual result data
      mutate(
        currentHosts => {
          const updatedHosts = currentHosts?.map(host => 
            host.id === id ? result.data! : host
          ) || [];
          
          // Also update local cache
          saveHostsToCache(updatedHosts);
          return updatedHosts;
        },
        false
      );
      
      toast({
        title: 'Success',
        description: 'Host updated successfully',
      });
      return true;
    } catch (error) {
      console.error('Error updating host:', error);
      
      // Revert changes on error
      mutate();
      
      toast({
        title: 'Error',
        description: 'Failed to update host',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, mutate, saveHostsToCache]);

  const deleteHost = useCallback(async (id: string) => {
    try {
      setIsDeleting(true);
      
      // Optimistic UI update
      mutate(
        currentHosts => currentHosts?.filter(host => host.id !== id),
        false
      );
      
      const result = await deleteHostAction(id);
      
      if (!result.success) {
        // Rollback on failure by revalidating
        mutate();
        
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete host',
          variant: 'destructive',
        });
        return false;
      }
      
      // Save to local cache
      saveHostsToCache(hosts);
      
      toast({
        title: 'Success',
        description: 'Host deleted successfully',
      });
      return true;
    } catch (error) {
      console.error('Error deleting host:', error);
      
      // Rollback on error by revalidating
      mutate();
      
      toast({
        title: 'Error',
        description: 'Failed to delete host',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [toast, hosts, saveHostsToCache, mutate]);

  const testConnection = useCallback(async (id: string) => {
    try {
      setIsTesting(id);
      
      // Optimistically update UI
      mutate(
        currentHosts => 
          currentHosts?.map(host => 
            host.id === id 
              ? { ...host, status: 'testing' } 
              : host
          ),
        // Don't revalidate yet
        false
      );
      
      const result = await testConnectionAction(id);
      
      // Update cache with the test results
      mutate(
        currentHosts => {
          if (!currentHosts) return [];
          
          return currentHosts.map(host => {
            if (host.id === id) {
              const currentTime = new Date();
              return {
                ...host,
                status: result.success ? 'connected' : 'failed',
                errorMessage: !result.success ? result.error : undefined,
                updated_at: result.success ? currentTime : host.updated_at
              };
            }
            return host;
          });
        },
        // Don't revalidate since we already have fresh data
        false
      );
      
      // Save to local cache
      saveHostsToCache(hosts);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Connection test successful',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Connection test failed',
          variant: 'destructive',
        });
      }
      return result.success;
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive',
      });
      
      // Revalidate to refresh the data
      mutate();
      
      return false;
    } finally {
      setIsTesting(null);
    }
  }, [toast, hosts, saveHostsToCache, mutate]);

  const refreshConnections = useCallback(async () => {
    try {
      // Show refreshing state
      mutate(undefined, { revalidate: false }); // Start loading state
      
      // First refresh the hosts list with SWR
      await mutate();
      
      // Then test all connections
      const testResults = await testAllHosts();
      
      if (testResults.success && testResults.results) {
        // Update the status of each host in the cache
        mutate(currentHosts => {
          if (!currentHosts) return [];
          
          const now = new Date();
          const updatedHosts = currentHosts.map(host => {
            const result = testResults.results?.find(r => r.id === host.id);
            if (result) {
              return {
                ...host,
                status: result.success ? 'connected' : 'failed',
                errorMessage: !result.success ? result.message : undefined,
                updated_at: result.success ? now : host.updated_at
              };
            }
            return host;
          });
          
          // Save to local cache as well
          saveHostsToCache(updatedHosts);
          return updatedHosts;
        }, false);
        
        toast({
          title: 'Success',
          description: 'Hosts refreshed successfully',
        });
        return true;
      } else {
        toast({
          title: 'Warning',
          description: testResults.error || 'Failed to test some connections',
          variant: 'default',
        });
        return false;
      }
    } catch (error) {
      console.error('Error refreshing connections:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh connections',
        variant: 'destructive',
      });
      
      // Force a fresh revalidation in case of error
      mutate();
      
      return false;
    }
  }, [toast, saveHostsToCache, mutate]);

  // Run only once on mount, SWR handles the data fetching
  useEffect(() => {
    console.log('useHosts hook mounted - SWR will handle data fetching');
    
    // Handle edge cases with localStorage fallback during SWR loading
    const { hosts: cachedHosts, isFresh } = getHostsFromCache();
    if (cachedHosts && isFresh && !data && !error) {
      console.log('Using cached hosts while SWR loads');
      // This won't trigger a new fetch, just a temporary display
      mutate(cachedHosts, false);
    }
  }, []);

  return {
    hosts,
    isLoading: swrLoading,
    isRefreshing: isValidating,
    isDeleting,
    isTesting,
    addHost: addNewHost,
    updateHost: updateHostDetails,
    deleteHost,
    refreshConnections: () => {
      console.log('refreshConnections called');
      // Set validating state manually first for immediate UI feedback
      mutate(undefined, { revalidate: false });
      return refreshConnections();
    },
    testConnection,
    forceRefresh: () => {
      console.log('forceRefresh called');
      return mutate();
    },
    error: error ? (error as Error).message : undefined
  };
}
