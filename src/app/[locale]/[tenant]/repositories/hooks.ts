'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { Repository, GitProvider } from './types';
import {
  getRepositories,
  createRepository,
  getRepository,
  updateRepository,
  deleteRepository,
  syncRepository as syncRepositoryApi,
} from '@/app/actions/repositories';
import {
  getGitProviders,
  addGitProvider,
  updateGitProvider,
  refreshGitProvider,
} from '@/app/actions/git-providers';

/**
 * Hook for managing multiple repositories
 */
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

        // Fixed type error by checking for data existence
        if (result.data) {
          setRepositories((prevRepositories) => [...prevRepositories, result.data as Repository]);
        }

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

/**
 * Hook for managing a single repository
 */
export function useRepository(initialRepositoryId?: string) {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(initialRepositoryId ? true : false);
  const [error, setError] = useState<Error | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const fetchRepository = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);

        const result = await getRepository(id);

        if (!result.success) {
          setError(new Error(result.error || 'Failed to fetch repository'));
          toast({
            title: 'Error',
            description: result.error || 'Failed to fetch repository',
            variant: 'destructive',
          });
          return null;
        }

        setRepository(result.data || null);
        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repository';
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

  const updateRepositoryDetails = useCallback(
    async (updates: Partial<Omit<Repository, 'id'>>) => {
      if (!repository?.id) {
        toast({
          title: 'Error',
          description: 'No repository selected',
          variant: 'destructive',
        });
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await updateRepository(repository.id, updates);

        if (!result.success) {
          setError(new Error(result.error || 'Failed to update repository'));
          toast({
            title: 'Error',
            description: result.error || 'Failed to update repository',
            variant: 'destructive',
          });
          return null;
        }

        setRepository(result.data || null);

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
    [repository, toast],
  );

  const removeRepository = useCallback(async () => {
    if (!repository?.id) {
      toast({
        title: 'Error',
        description: 'No repository selected',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await deleteRepository(repository.id);

      if (!result.success) {
        setError(new Error(result.error || 'Failed to delete repository'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete repository',
          variant: 'destructive',
        });
        return false;
      }

      setRepository(null);

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
  }, [repository, toast]);

  const syncRepository = useCallback(async () => {
    if (!repository?.id) {
      toast({
        title: 'Error',
        description: 'No repository selected',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setIsSyncing(true);
      setError(null);

      const result = await syncRepositoryApi(repository.id);

      if (!result.success) {
        setError(new Error(result.error || 'Failed to sync repository'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to sync repository',
          variant: 'destructive',
        });

        // Update repository status
        setRepository((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'failed',
            errorMessage: result.error,
          };
        });

        return false;
      }

      // Update repository status
      setRepository((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'synced',
          errorMessage: undefined,
        };
      });

      toast({
        title: 'Success',
        // Fixed linter error by removing reference to `result.message`
        description: 'Repository synced successfully',
      });

      return true;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync repository';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [repository, toast]);

  // Fetch repository on mount if initialRepositoryId is provided
  useEffect(() => {
    if (initialRepositoryId) {
      fetchRepository(initialRepositoryId);
    }
  }, [initialRepositoryId, fetchRepository]);

  return {
    repository,
    loading,
    error,
    isSyncing,
    fetchRepository,
    updateRepository: updateRepositoryDetails,
    deleteRepository: removeRepository,
    syncRepository,
    isLoaded: !loading && repository !== null,
  };
}

/**
 * Hook for managing Git providers
 */
export function useGitProviders() {
  const [providers, setProviders] = useState<GitProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<GitProvider | null>(null);
  const { toast } = useToast();

  const fetchProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getGitProviders();
      if (response.success && response.data) {
        setProviders(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch git providers');
      }
    } catch (error) {
      console.error('Error fetching git providers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch git providers',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const addProvider = useCallback(
    async (data: Omit<GitProvider, 'id'>) => {
      try {
        setIsAddingProvider(true);
        const newProvider = await addGitProvider(data);
        setProviders((prev) => [...prev, newProvider]);
        toast({
          title: 'Success',
          description: 'Git provider added successfully',
        });
        return true;
      } catch (error) {
        console.error('Error adding git provider:', error);
        toast({
          title: 'Error',
          description: 'Failed to add git provider',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsAddingProvider(false);
      }
    },
    [toast],
  );

  const editProvider = useCallback(
    async (id: string, data: Partial<GitProvider>) => {
      try {
        const updatedProvider = await updateGitProvider(id, data);
        setProviders((prev) =>
          prev.map((provider) => (provider.id === id ? updatedProvider : provider)),
        );
        setEditingProvider(null);
        toast({
          title: 'Success',
          description: 'Git provider updated successfully',
        });
        return true;
      } catch (error) {
        console.error('Error updating git provider:', error);
        toast({
          title: 'Error',
          description: 'Failed to update git provider',
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast],
  );

  const refreshProvider = useCallback(
    async (id: string) => {
      try {
        setIsRefreshing(id);
        const updatedProvider = await refreshGitProvider(id);
        setProviders((prev) =>
          prev.map((provider) => (provider.id === id ? updatedProvider : provider)),
        );
        toast({
          title: 'Success',
          description: 'Git provider refreshed successfully',
        });
      } catch (error) {
        console.error('Error refreshing git provider:', error);
        toast({
          title: 'Error',
          description: 'Failed to refresh git provider',
          variant: 'destructive',
        });
      } finally {
        setIsRefreshing(null);
      }
    },
    [toast],
  );

  // Fetch providers on mount
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return {
    providers,
    isLoading,
    isRefreshing,
    refreshProvider,
    addProvider,
    isAddingProvider,
    editProvider,
    editingProvider,
    setEditingProvider,
  };
}
