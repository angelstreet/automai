'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
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

export function useHosts(initialHosts: Host[] = []) {
  const [hosts, setHosts] = useState<Host[]>(initialHosts);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const { toast } = useToast();

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

  const fetchHosts = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      
      // Check if we have fresh cached data
      const { hosts: cachedHosts, isFresh } = getHostsFromCache();
      
      // Use cached data if available and not forcing a refresh
      if (!forceRefresh && cachedHosts && isFresh) {
        console.log('Using cached hosts data');
        setHosts(cachedHosts);
        setIsLoading(false);
        return;
      }
      
      // Otherwise fetch from API
      console.log('Fetching hosts from API');
      const result = await getHosts();
      
      if (!result.success) {
        // If API fails but we have cached data, use it regardless of freshness
        if (cachedHosts) {
          console.log('API fetch failed, falling back to cached data');
          setHosts(cachedHosts);
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to fetch hosts',
            variant: 'destructive',
          });
        }
        return;
      }
      
      const fetchedHosts = result.data || [];
      setHosts(fetchedHosts);
      
      // Update the cache with fresh data
      saveHostsToCache(fetchedHosts);
    } catch (error) {
      console.error('Error fetching hosts:', error);
      
      // Attempt to use cached data as fallback
      const { hosts: cachedHosts } = getHostsFromCache();
      if (cachedHosts) {
        console.log('Error fetching, using cached hosts data');
        setHosts(cachedHosts);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch hosts',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, getHostsFromCache, saveHostsToCache]);

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
      
      // Update state and cache
      const updatedHosts = [...hosts, processedHost];
      setHosts(updatedHosts);
      saveHostsToCache(updatedHosts);
      
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
  }, [toast, hosts, saveHostsToCache]);

  const updateHostDetails = useCallback(async (id: string, updates: Partial<Omit<Host, 'id'>>) => {
    try {
      const result = await updateHost(id, updates);
      
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update host',
          variant: 'destructive',
        });
        return false;
      }
      
      // Update state and cache
      const updatedHosts = hosts.map(host => host.id === id ? result.data! : host);
      setHosts(updatedHosts);
      saveHostsToCache(updatedHosts);
      
      toast({
        title: 'Success',
        description: 'Host updated successfully',
      });
      return true;
    } catch (error) {
      console.error('Error updating host:', error);
      toast({
        title: 'Error',
        description: 'Failed to update host',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, hosts, saveHostsToCache]);

  const deleteHost = useCallback(async (id: string) => {
    try {
      setIsDeleting(true);
      const result = await deleteHostAction(id);
      
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete host',
          variant: 'destructive',
        });
        return false;
      }
      
      // Update state and cache
      const updatedHosts = hosts.filter(host => host.id !== id);
      setHosts(updatedHosts);
      saveHostsToCache(updatedHosts);
      
      toast({
        title: 'Success',
        description: 'Host deleted successfully',
      });
      return true;
    } catch (error) {
      console.error('Error deleting host:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete host',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [toast, hosts, saveHostsToCache]);

  const testConnection = useCallback(async (id: string) => {
    try {
      setIsTesting(id);
      const result = await testConnectionAction(id);
      
      // Update host status based on test result
      const updatedHosts = hosts.map(host => {
        if (host.id === id) {
          // When test is successful, update the timestamp
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
      
      // Update state and cache
      setHosts(updatedHosts);
      saveHostsToCache(updatedHosts);

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
      return false;
    } finally {
      setIsTesting(null);
    }
  }, [toast, hosts, saveHostsToCache]);

  const refreshConnections = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      // Always force refresh from API when explicitly refreshing
      const hostsResult = await getHosts();
      
      if (!hostsResult.success) {
        toast({
          title: 'Error',
          description: hostsResult.error || 'Failed to fetch hosts',
          variant: 'destructive',
        });
        return false;
      }
      
      // Set hosts without saving to cache yet (we'll save after updating statuses)
      setHosts(hostsResult.data || []);

      // Test all connections
      const testResults = await testAllHosts();
      if (testResults.success && testResults.results) {
        const now = new Date();
        const updatedHosts = hostsResult.data.map(host => {
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
        
        // Update state and cache with the updated statuses
        setHosts(updatedHosts);
        saveHostsToCache(updatedHosts);
        
        toast({
          title: 'Success',
          description: 'Hosts refreshed successfully',
        });
        return true;
      } else {
        // Save the hosts data to cache even if connection tests failed
        saveHostsToCache(hostsResult.data || []);
        
        toast({
          title: 'Warning',
          description: testResults.error || 'Failed to test connections, but hosts were refreshed',
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
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [toast, saveHostsToCache]);

  // Fetch hosts on mount, using cached data if available
  useEffect(() => {
    const initializeHosts = async () => {
      await fetchHosts(false);  // false = use cache if available
    };
    
    initializeHosts();
  }, [fetchHosts]);

  return {
    hosts,
    isLoading,
    isRefreshing,
    isDeleting,
    isTesting,
    addHost: addNewHost,
    updateHost: updateHostDetails,
    deleteHost,
    refreshConnections,
    testConnection,
    forceRefresh: () => fetchHosts(true),  // Force refresh from API
  };
}
