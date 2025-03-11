'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { Host } from '@/types/hosts';
import {
  getHost,
  updateHost,
  deleteHost,
  testHostConnection as testHostConnectionApi,
} from '@/app/actions/hosts';

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

      const result = await deleteHost(host.id);

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

      toast({
        title: 'Success',
        description: 'Host deleted successfully',
      });

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

      const result = await testHostConnectionApi(host.id);

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

      toast({
        title: 'Success',
        description: result.message || 'Connection test successful',
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
