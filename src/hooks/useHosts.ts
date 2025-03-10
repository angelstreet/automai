'use client';

import { useState, useCallback } from 'react';
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

// SWR fetcher function
const hostsFetcher = async () => {
  const result = await getHosts();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch hosts');
  }
  return result.data || [];
};

export function useHosts(initialHosts: Host[] = []) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Host[]>(
    'hosts',
    hostsFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000, // 5 seconds between identical requests
      fallbackData: initialHosts
    }
  );
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const { toast } = useToast();
  
  const hosts = data || [];

  // Add a new host
  const addNewHost = useCallback(async (hostData: Omit<Host, 'id'>) => {
    try {
      const result = await addHost(hostData);
      
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add host',
          variant: 'destructive',
        });
        return false;
      }
      
      // Update cache with the new host
      mutate(currentHosts => [...(currentHosts || []), result.data!], false);
      
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
  }, [toast, mutate]);

  // Update an existing host
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
      
      // Update with actual server data
      mutate();
      
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
  }, [toast, mutate]);

  // Delete a host
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
        // Rollback on failure
        mutate();
        
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete host',
          variant: 'destructive',
        });
        return false;
      }
      
      toast({
        title: 'Success',
        description: 'Host deleted successfully',
      });
      return true;
    } catch (error) {
      console.error('Error deleting host:', error);
      
      // Rollback on error
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
  }, [toast, mutate]);

  // Test host connection
  const testConnection = useCallback(async (id: string) => {
    try {
      setIsTesting(id);
      
      // Optimistic update
      mutate(
        currentHosts => 
          currentHosts?.map(host => 
            host.id === id 
              ? { ...host, status: 'testing' } 
              : host
          ),
        false
      );
      
      const result = await testConnectionAction(id);
      
      // Update with test results
      mutate(
        currentHosts => {
          if (!currentHosts) return [];
          
          return currentHosts.map(host => {
            if (host.id === id) {
              return {
                ...host,
                status: result.success ? 'connected' : 'failed',
                errorMessage: !result.success ? result.error : undefined,
                updated_at: result.success ? new Date() : host.updated_at
              };
            }
            return host;
          });
        },
        false
      );

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
      
      // Refresh data on error
      mutate();
      
      return false;
    } finally {
      setIsTesting(null);
    }
  }, [toast, mutate]);

  // Refresh all host connections
  const refreshConnections = useCallback(async () => {
    try {
      // First refresh the hosts list
      await mutate();
      
      // Then test all connections
      const testResults = await testAllHosts();
      
      if (testResults.success && testResults.results) {
        // Update the status of each host
        mutate(
          currentHosts => {
            if (!currentHosts) return [];
            
            const now = new Date();
            return currentHosts.map(host => {
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
          },
          false
        );
        
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
  }, [toast, mutate]);

  return {
    hosts,
    isLoading,
    isRefreshing: isValidating,
    isDeleting,
    isTesting,
    addHost: addNewHost,
    updateHost: updateHostDetails,
    deleteHost,
    refreshConnections,
    testConnection,
    forceRefresh: () => mutate(),
    error: error ? (error as Error).message : undefined
  };
}