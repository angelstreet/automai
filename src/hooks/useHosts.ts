'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import useSWR from 'swr';
import { Host } from '@/types/hosts';
import { getHosts, deleteHost as deleteHostAction, testAllHosts, addHost, testConnection, checkAllConnections } from '@/app/actions/hosts';

// Define a SWR fetcher function for hosts with request throttling
const requestTimestamps: number[] = [];
const REQUEST_LIMIT = 5; // Max requests in window
const REQUEST_WINDOW = 10000; // 10 second window

const hostsFetcher = async () => {
  const now = Date.now();
  
  // Add current timestamp and remove old ones
  requestTimestamps.push(now);
  const recentRequests = requestTimestamps.filter(ts => now - ts < REQUEST_WINDOW);
  requestTimestamps.length = 0;
  requestTimestamps.push(...recentRequests);
  
  // If too many requests in window, throw error to prevent rate limit
  if (requestTimestamps.length > REQUEST_LIMIT) {
    console.warn(`Too many API requests (${requestTimestamps.length}) in ${REQUEST_WINDOW/1000}s window. Throttling.`);
    throw new Error('Request throttled');
  }
  
  // Fetch hosts with normal flow
  const result = await getHosts();
  const hosts = result.data || [];
  
  // Process hosts for consistency
  return hosts.map((host: Host) => ({
    ...host,
    status: host.status || 'pending',
    lastConnected: host.lastConnected || host.created_at,
  }));
};

export function useHosts(initialHosts: Host[] = []) {
  // Use a stable key to prevent multiple fetches
  const HOSTS_CACHE_KEY = 'global-hosts-key';
  const lastRequestTimeRef = useRef<number>(0);
  const MIN_REQUEST_INTERVAL = 3000; // Minimum 3 seconds between requests
  
  // Wrap the fetcher with request throttling
  const throttledFetcher = useCallback(async () => {
    const now = Date.now();
    if (now - lastRequestTimeRef.current < MIN_REQUEST_INTERVAL) {
      console.log(`Request throttled, last request was ${now - lastRequestTimeRef.current}ms ago`);
      // Return existing data from cache
      return initialHosts;
    }
    
    // Record the request time
    lastRequestTimeRef.current = now;
    return hostsFetcher();
  }, [initialHosts]);
  
  const { data, error, isLoading: swrIsLoading, isValidating, mutate } = useSWR(
    HOSTS_CACHE_KEY, 
    throttledFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 120000, // 2 minutes between identical requests
      fallbackData: initialHosts,
      revalidateIfStale: false, // Don't revalidate stale data automatically
      revalidateOnMount: true, // Only fetch on initial mount
      focusThrottleInterval: 180000, // 3 minutes between focus revalidations
      errorRetryCount: 0, // No automatic retries
      shouldRetryOnError: false, // Don't retry on errors
      loadingTimeout: 10000, // 10 seconds before timeout
      onLoadingSlow: () => console.warn('Slow loading of hosts data'),
      isPaused: () => false, // Never pause to ensure only one request is active
    }
  );
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const { toast } = useToast();
  
  // Update local state when SWR data changes
  useEffect(() => {
    setIsLoading(swrIsLoading);
  }, [swrIsLoading]);
  
  const hosts = data || [];

  // Add a new host
  const addNewHost = useCallback(async (hostData: Omit<Host, 'id'>) => {
    try {
      // Create new host
      const result = await addHost({
        name: hostData.name,
        description: hostData.description || '',
        type: hostData.type,
        ip: hostData.ip,
        port: hostData.port || 22,
        user: hostData.username || hostData.user,
        password: hostData.password || '',
        status: 'connected' // Set to connected since we've already tested the connection
      });
      
      const newHost = result.data;
      
      // Update cache with the new host
      mutate(
        currentHosts => [...(currentHosts || []), newHost],
        false
      );
      
      return true;
    } catch (error) {
      console.error('Error adding host:', error);
      return false;
    }
  }, [mutate]);

  // Update an existing host - implement this when the API has update functionality
  const updateHostDetails = useCallback(async (id: string, updates: Partial<Omit<Host, 'id'>>) => {
    try {
      // Optimistic update
      mutate(
        currentHosts => currentHosts?.map(host => 
          host.id === id ? { ...host, ...updates } : host
        ),
        false
      );
      
      // TODO: Implement API call when the update endpoint is available
      // For now, just use the optimistic update
      
      return true;
    } catch (error) {
      console.error('Error updating host:', error);
      
      // Revert changes on error
      mutate();
      
      return false;
    }
  }, [mutate]);

  // Delete a host
  const deleteHost = useCallback(async (id: string) => {
    try {
      setIsDeleting(true);
      
      // Use the server action to delete the host first
      const result = await deleteHostAction(id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete host');
      }
      
      // Only update UI after successful deletion
      mutate(
        currentHosts => currentHosts?.filter(host => host.id !== id),
        false
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting host:', error);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [mutate]);

  // Test host connection
  const testHostConnection = useCallback(async (id: string) => {
    try {
      setIsTesting(id);
      
      // Find the host
      const host = hosts.find(host => host.id === id);
      if (!host) {
        throw new Error('Host not found');
      }
      
      // Set initial status to failed (red)
      mutate(
        currentHosts => 
          currentHosts?.map(h => 
            h.id === id 
              ? { ...h, status: 'failed' } 
              : h
          ),
        false
      );
      
      // Small delay to show the red state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Set to testing state
      mutate(
        currentHosts => 
          currentHosts?.map(h => 
            h.id === id 
              ? { ...h, status: 'testing' } 
              : h
          ),
        false
      );
      
      const result = await testConnection({
        type: host.type,
        ip: host.ip,
        port: host.port,
        username: host.user,
        password: host.password,
        hostId: host.id
      });
      
      // Update with test results
      mutate(
        currentHosts => {
          if (!currentHosts) return [];
          
          return currentHosts.map(h => {
            if (h.id === id) {
              return {
                ...h,
                status: result.success ? 'connected' : 'failed',
                errorMessage: !result.success ? result.message : undefined,
                updated_at: result.success ? new Date() : h.updated_at
              };
            }
            return h;
          });
        },
        false
      );

      return result.success;
    } catch (error) {
      console.error('Error testing connection:', error);
      
      // Update status to failed on error
      mutate(
        currentHosts => 
          currentHosts?.map(h => 
            h.id === id 
              ? { ...h, status: 'failed', errorMessage: 'Failed to test connection' } 
              : h
          ),
        false
      );
      
      return false;
    } finally {
      setIsTesting(null);
    }
  }, [hosts, mutate]);

  // Refresh all host connections with throttling
  const lastRefreshTimeRef = useRef<number>(0);
  const MIN_REFRESH_INTERVAL = 5000; // 5 seconds minimum between refreshes
  
  const refreshConnections = useCallback(async () => {
    // Check if we're trying to refresh too frequently
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < MIN_REFRESH_INTERVAL) {
      console.log(`Refresh throttled, last refresh was ${now - lastRefreshTimeRef.current}ms ago`);
      return false;
    }
    
    // Update the last refresh time
    lastRefreshTimeRef.current = now;
    
    try {
      setIsRefreshingAll(true);
      
      // Use mutate to refresh the hosts list, but don't cause a refetch if we already have data
      if (hosts.length === 0) {
        await mutate();
      }
      
      // Then test all connections, but only if we have hosts
      if (hosts.length === 0) {
        return false;
      }

      // First set all hosts to failed state
      mutate(
        currentHosts => currentHosts?.map(host => ({
          ...host,
          status: 'failed'
        })),
        false
      );

      // Small delay to show the red state
      await new Promise(resolve => setTimeout(resolve, 500));

      // Then set all to testing state
      mutate(
        currentHosts => currentHosts?.map(host => ({
          ...host,
          status: 'testing'
        })),
        false
      );
      
      // API call to test all connections
      const results = await testAllHosts();
      
      if (results.success && results.results) {
        // Update hosts one by one as they complete testing
        for (const result of results.results) {
          await mutate(
            currentHosts => {
              if (!currentHosts || currentHosts.length === 0) return hosts;
              
              const now = new Date();
              return currentHosts.map(host => {
                if (host.id === result.hostId) {
                  return {
                    ...host,
                    status: result.result.success ? 'connected' : 'failed',
                    errorMessage: !result.result.success ? result.result.message : undefined,
                    updated_at: result.result.success ? now : host.updated_at
                  };
                }
                return host;
              });
            },
            false
          );
        }
        
        return true;
      } else {
        // If the API call fails, set all hosts back to their previous state
        await mutate();
        return false;
      }
    } catch (error) {
      console.error('Error refreshing connections:', error);
      // If there's an error, revert to previous state
      await mutate();
      return false;
    } finally {
      setIsRefreshingAll(false);
    }
  }, [mutate, hosts]);

  return {
    hosts,
    isLoading,
    isRefreshing: isRefreshingAll,
    isDeleting,
    isTesting,
    addHost: addNewHost,
    updateHost: updateHostDetails,
    deleteHost,
    refreshConnections,
    testConnection: testHostConnection,
    forceRefresh: () => mutate(),
    error: error ? (error as Error).message : undefined
  };
}