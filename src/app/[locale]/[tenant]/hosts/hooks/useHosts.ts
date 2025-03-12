'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { Host } from '../types';
import { getHosts, createHost } from '@/app/actions/hosts';

export function useHosts() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchHosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getHosts();

      if (!result.success) {
        setError(new Error(result.error || 'Failed to fetch hosts'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch hosts',
          variant: 'destructive',
        });
        return [];
      }

      setHosts(result.data || []);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hosts';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addHost = useCallback(
    async (hostData: Omit<Host, 'id'>) => {
      try {
        setLoading(true);
        setError(null);

        const result = await createHost(hostData);

        if (!result.success) {
          setError(new Error(result.error || 'Failed to create host'));
          toast({
            title: 'Error',
            description: result.error || 'Failed to create host',
            variant: 'destructive',
          });
          return null;
        }

        setHosts((prevHosts) => [...prevHosts, result.data]);

        toast({
          title: 'Success',
          description: 'Host created successfully',
        });

        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create host';
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

  // Fetch hosts on mount
  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  return {
    hosts,
    loading,
    error,
    fetchHosts,
    addHost,
    isLoaded: !loading && hosts !== null,
  };
} 