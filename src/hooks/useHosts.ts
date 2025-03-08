'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { Host } from '@/types/hosts';
import { 
  getHosts, 
  addHost, 
  deleteHost as deleteHostAction, 
  testConnection as testConnectionAction,
  testAllHosts 
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
      const data = await getHosts();
      setHosts(data);
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
      const newHost = await addHost(data);
      setHosts(prev => [...prev, newHost]);
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

  const deleteHost = useCallback(async (id: string) => {
    try {
      setIsDeleting(true);
      await deleteHostAction(id);
      setHosts(prev => prev.filter(host => host.id !== id));
      toast({
        title: 'Success',
        description: 'Host deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting host:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete host',
        variant: 'destructive',
      });
      throw error;
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
          return {
            ...host,
            status: result.success ? 'connected' : 'failed',
            errorMessage: !result.success ? result.message : undefined,
            lastConnected: result.success ? new Date() : host.lastConnected,
          };
        }
        return host;
      }));

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Connection test successful',
        });
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Connection test failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(null);
    }
  }, [toast]);

  const refreshConnections = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const freshHosts = await getHosts();
      setHosts(freshHosts);

      // Test all connections
      const testResults = await testAllHosts();
      if (testResults.success) {
        const now = new Date();
        setHosts(prev => prev.map(host => {
          const result = testResults.results.find(r => r.id === host.id);
          if (result) {
            return {
              ...host,
              status: result.success ? 'connected' : 'failed',
              errorMessage: !result.success ? result.message : undefined,
              lastConnected: result.success ? now : host.lastConnected,
            };
          }
          return host;
        }));
      }

      toast({
        title: 'Success',
        description: 'Hosts refreshed successfully',
      });
    } catch (error) {
      console.error('Error refreshing connections:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh connections',
        variant: 'destructive',
      });
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
    deleteHost,
    refreshConnections,
    testConnection,
  };
}
