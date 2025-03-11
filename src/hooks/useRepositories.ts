'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import {
  getRepositories,
  createRepository,
  updateRepository,
  deleteRepository,
  syncRepository,
} from '@/app/actions/repositories';
import { Repository } from '@/types/repositories';

export function useRepositories(initialProviderId?: string) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchRepositories = useCallback(
    async (providerId?: string) => {
      try {
        setLoading(true);
        setError(null);

        const filter = providerId ? { providerId } : undefined;
        const result = await getRepositories(filter);

        if (!result.success) {
          setError(new Error(result.error || 'Failed to fetch repositories'));
          toast({
            title: 'Error',
            description: result.error || 'Failed to fetch repositories',
            variant: 'destructive',
          });
          return;
        }

        setRepositories(result.data || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repositories';
        setError(err instanceof Error ? err : new Error(errorMessage));
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const addRepository = useCallback(
    async (data: Partial<Repository>) => {
      try {
        setLoading(true);
        setError(null);

        const result = await createRepository(data);

        if (!result.success) {
          setError(new Error(result.error || 'Failed to create repository'));
          toast({
            title: 'Error',
            description: result.error || 'Failed to create repository',
            variant: 'destructive',
          });
          return null;
        }

        // Update local state optimistically
        setRepositories((prev) => [result.data!, ...prev]);

        toast({
          title: 'Success',
          description: 'Repository created successfully',
        });

        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create repository';
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

  const updateRepo = useCallback(
    async (id: string, updates: Partial<Repository>) => {
      try {
        setLoading(true);
        setError(null);

        const result = await updateRepository(id, updates);

        if (!result.success) {
          setError(new Error(result.error || 'Failed to update repository'));
          toast({
            title: 'Error',
            description: result.error || 'Failed to update repository',
            variant: 'destructive',
          });
          return null;
        }

        // Update local state optimistically
        setRepositories((prev) => prev.map((repo) => (repo.id === id ? result.data! : repo)));

        toast({
          title: 'Success',
          description: 'Repository updated successfully',
        });

        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update repository';
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

  const removeRepository = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);

        const result = await deleteRepository(id);

        if (!result.success) {
          setError(new Error(result.error || 'Failed to delete repository'));
          toast({
            title: 'Error',
            description: result.error || 'Failed to delete repository',
            variant: 'destructive',
          });
          return false;
        }

        // Update local state optimistically
        setRepositories((prev) => prev.filter((repo) => repo.id !== id));

        toast({
          title: 'Success',
          description: 'Repository deleted successfully',
        });

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete repository';
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
    },
    [toast],
  );

  const syncRepo = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);

        const result = await syncRepository(id);

        if (!result.success) {
          setError(new Error(result.error || 'Failed to sync repository'));
          toast({
            title: 'Error',
            description: result.error || 'Failed to sync repository',
            variant: 'destructive',
          });
          return null;
        }

        // Update local state optimistically
        setRepositories((prev) => prev.map((repo) => (repo.id === id ? result.data! : repo)));

        toast({
          title: 'Success',
          description: 'Repository synced successfully',
        });

        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to sync repository';
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

  // Fetch repositories on mount
  useEffect(() => {
    fetchRepositories(initialProviderId);
  }, [fetchRepositories, initialProviderId]);

  return {
    repositories,
    loading,
    error,
    fetchRepositories,
    addRepository,
    updateRepository: updateRepo,
    deleteRepository: removeRepository,
    syncRepository: syncRepo,
  };
}
