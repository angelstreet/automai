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

export function useHosts(initialHosts: Host[] = []) {
  const [hosts, setHosts] = useState<Host[]>(initialHosts);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchHosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getHosts();
      
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch hosts',
          variant: 'destructive',
        });
        return;
      }
      
      setHosts(result.data || []);
    } catch (error) {
      console.error('Error fetching hosts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch hosts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
      
      setHosts(prev => [...prev, processedHost]);
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
  }, [toast]);

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
      
      setHosts(prev => prev.map(host => host.id === id ? result.data! : host));
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
  }, [toast]);

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
      
      setHosts(prev => prev.filter(host => host.id !== id));
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
  }, [toast]);

  const testConnection = useCallback(async (id: string) => {
    try {
      setIsTesting(id);
      const result = await testConnectionAction(id);
      
      // Update host status based on test result
      setHosts(prev => prev.map(host => {
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
      }));

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
  }, [toast]);

  const refreshConnections = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const hostsResult = await getHosts();
      
      if (!hostsResult.success) {
        toast({
          title: 'Error',
          description: hostsResult.error || 'Failed to fetch hosts',
          variant: 'destructive',
        });
        return false;
      }
      
      setHosts(hostsResult.data || []);

      // Test all connections
      const testResults = await testAllHosts();
      if (testResults.success && testResults.results) {
        const now = new Date();
        setHosts(prev => prev.map(host => {
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
        }));
        
        toast({
          title: 'Success',
          description: 'Hosts refreshed successfully',
        });
        return true;
      } else {
        toast({
          title: 'Error',
          description: testResults.error || 'Failed to test connections',
          variant: 'destructive',
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
  }, [toast]);

  // Fetch hosts on mount
  useEffect(() => {
    fetchHosts();
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
  };
}
