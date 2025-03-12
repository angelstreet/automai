'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/shadcn/use-toast';
import { Host } from './types';
import { deleteHost as deleteHostAction, getHost, updateHost, getHosts, createHost, testConnection } from './actions';
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

/**
 * Hook to manage a list of hosts
 * @returns Object with hosts data and management functions
 */
export function useHostsList() {
  const { toast } = useToast();
  const [hosts, setHosts] = useState<Host[]>(getCachedHosts());
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch hosts from API with SWR for caching
  const { data, isValidating, mutate } = useSWR<{ success: boolean; data?: Host[]; error?: string }>(
    'hosts',
    async () => {
      try {
        const result = await getHosts();
        return result;
      } catch (err) {
        console.error('Error fetching hosts:', err);
        throw err;
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 10 seconds
      onSuccess: (data) => {
        if (data?.success && data.data) {
          setHosts(data.data);
          setCachedHosts(data.data);
          setError(null);
        } else if (data?.error) {
          setError(data.error);
          toast({
            title: 'Error fetching hosts',
            description: data.error,
            variant: 'destructive',
          });
        }
        setLoading(false);
        setIsLoaded(true);
      },
      onError: (err) => {
        console.error('Error fetching hosts:', err);
        setError(err.message || 'Failed to fetch hosts');
        setLoading(false);
        setIsLoaded(true);
        toast({
          title: 'Error fetching hosts',
          description: err.message || 'Failed to fetch hosts',
          variant: 'destructive',
        });
      },
    }
  );

  // Function to fetch hosts
  const fetchHosts = useCallback(async () => {
    try {
      setLoading(true);
      await mutate();
    } catch (err) {
      console.error('Error refreshing hosts:', err);
    }
  }, [mutate]);

  // Function to add a new host
  const addHost = useCallback(async (hostData: Partial<Host>) => {
    try {
      const result = await createHost(hostData);
      if (result.success && result.data) {
        // Update the local state and cache
        const updatedHosts = [...hosts, result.data];
        setHosts(updatedHosts);
        setCachedHosts(updatedHosts);
        toast({
          title: 'Host added successfully',
          description: `${hostData.name} has been added.`,
        });
        return result.data;
      } else {
        toast({
          title: 'Error adding host',
          description: result.error || 'Failed to add host',
          variant: 'destructive',
        });
        return null;
      }
    } catch (err) {
      console.error('Error adding host:', err);
      toast({
        title: 'Error adding host',
        description: err instanceof Error ? err.message : 'Failed to add host',
        variant: 'destructive',
      });
      return null;
    }
  }, [hosts, toast]);

  return {
    hosts,
    loading,
    isValidating,
    isLoaded,
    error,
    fetchHosts,
    addHost,
  };
}

/**
 * Hook to manage a single host's operations
 * @param hostId The ID of the host to manage
 * @returns Object with host data and management functions
 */
export function useHostManagement(hostId?: string) {
  const { toast } = useToast();
  const router = useRouter();
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(hostId ? true : false);
  const [error, setError] = useState<string | null>(null);

  // Fetch host data if ID is provided
  useEffect(() => {
    if (hostId) {
      fetchHost();
    }
  }, [hostId]);

  // Function to fetch host data
  const fetchHost = useCallback(async () => {
    if (!hostId) return;
    
    try {
      setLoading(true);
      const result = await getHost(hostId);
      
      if (result.success && result.data) {
        setHost(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch host');
        toast({
          title: 'Error fetching host',
          description: result.error || 'Failed to fetch host',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error fetching host:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch host');
      toast({
        title: 'Error fetching host',
        description: err instanceof Error ? err.message : 'Failed to fetch host',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [hostId, toast]);

  // Function to test connection to the host
  const testHostConnection = useCallback(async () => {
    if (!host) return false;
    
    try {
      // Call test connection with the correct field names
      const testResult = await testConnection({
        type: host.type,
        ip: host.ip,
        port: host.port,
        user: host.user,
        password: host.password,
      });
      
      if (testResult.success) {
        toast({
          title: 'Connection successful',
          description: testResult.message || 'Successfully connected to the host',
        });
        return true;
      } else {
        toast({
          title: 'Connection failed',
          description: testResult.error || 'Failed to connect to the host',
          variant: 'destructive',
        });
        return false;
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      toast({
        title: 'Connection failed',
        description: err instanceof Error ? err.message : 'Failed to connect to the host',
        variant: 'destructive',
      });
      return false;
    }
  }, [host, toast]);

  // Function to update host data
  const updateHostDetails = useCallback(async (updates: Partial<Host>) => {
    if (!hostId) return null;
    
    try {
      const result = await updateHost(hostId, updates);
      
      if (result.success && result.data) {
        setHost(result.data);
        toast({
          title: 'Host updated',
          description: 'Host has been updated successfully',
        });
        return result.data;
      } else {
        toast({
          title: 'Update failed',
          description: result.error || 'Failed to update host',
          variant: 'destructive',
        });
        return null;
      }
    } catch (err) {
      console.error('Error updating host:', err);
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Failed to update host',
        variant: 'destructive',
      });
      return null;
    }
  }, [hostId, toast]);

  // Function to delete the host
  const removeHost = useCallback(async () => {
    if (!hostId) return false;
    
    try {
      const result = await deleteHostAction(hostId);
      
      if (result.success) {
        toast({
          title: 'Host deleted',
          description: 'Host has been deleted successfully',
        });
        router.refresh();
        return true;
      } else {
        toast({
          title: 'Deletion failed',
          description: result.error || 'Failed to delete host',
          variant: 'destructive',
        });
        return false;
      }
    } catch (err) {
      console.error('Error deleting host:', err);
      toast({
        title: 'Deletion failed',
        description: err instanceof Error ? err.message : 'Failed to delete host',
        variant: 'destructive',
      });
      return false;
    }
  }, [hostId, router, toast]);

  return {
    host,
    loading,
    error,
    testConnection: testHostConnection,
    updateHost: updateHostDetails,
    deleteHost: removeHost,
    fetchHost,
  };
} 