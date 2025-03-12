'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { Repository } from '../types';
import { getRepositories, createRepository } from '@/app/actions/repositories';

export function useRepositories() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchRepositories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getRepositories();

      if (!result.success) {
        setError(new Error(result.error || 'Failed to fetch repositories'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch repositories',
          variant: 'destructive',
        });
        return [];
      }

      setRepositories(result.data || []);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repositories';
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

  const addRepository = useCallback(
    async (repositoryData: Omit<Repository, 'id'>) => {
      try {
        setLoading(true);
        setError(null);

        const result = await createRepository(repositoryData);

        if (!result.success) {
          setError(new Error(result.error || 'Failed to create repository'));
          toast({
            title: 'Error',
            description: result.error || 'Failed to create repository',
            variant: 'destructive',
          });
          return null;
        }

        setRepositories((prevRepositories) => [...prevRepositories, result.data]);

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

  // Fetch repositories on mount
  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  return {
    repositories,
    loading,
    error,
    fetchRepositories,
    addRepository,
    isLoaded: !loading && repositories !== null,
  };
} 