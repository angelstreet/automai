'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  getRepositories, 
  createRepository, 
  updateRepository, 
  deleteRepository,
  Repository,
  RepositoryFilter,
  syncRepository
} from '@/app/actions/repositories';
import { useToast } from '@/components/shadcn/use-toast';

export function useRepositories(initialFilter?: RepositoryFilter) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<RepositoryFilter | undefined>(initialFilter);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRepositories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRepositories(filter);
      setRepositories(data);
    } catch (err) {
      console.error('Error fetching repositories:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch repositories',
        variant: 'destructive',
      });
      setError(err instanceof Error ? err : new Error('Failed to fetch repositories'));
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  const create = async (data: Partial<Repository>) => {
    try {
      const newRepository = await createRepository(data);
      setRepositories(prev => [newRepository, ...prev]);
      return newRepository;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create repository');
    }
  };

  const update = async (id: string, data: Partial<Repository>) => {
    try {
      const updatedRepository = await updateRepository(id, data);
      setRepositories(prev => 
        prev.map(repo => repo.id === id ? updatedRepository : repo)
      );
      return updatedRepository;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update repository');
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteRepository(id);
      setRepositories(prev => prev.filter(repo => repo.id !== id));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete repository');
    }
  };

  const updateFilter = (newFilter: RepositoryFilter) => {
    setFilter(newFilter);
  };

  const handleSyncRepository = useCallback(async (id: string) => {
    try {
      setIsSyncing(id);
      const updatedRepo = await syncRepository(id);
      setRepositories(prev => 
        prev.map(repo => repo.id === id ? updatedRepo : repo)
      );
      toast({
        title: 'Success',
        description: 'Repository synced successfully',
      });
    } catch (error) {
      console.error('Error syncing repository:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync repository',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(null);
    }
  }, [toast]);

  const refreshAll = useCallback(async () => {
    await fetchRepositories();
  }, [fetchRepositories]);

  return {
    repositories,
    loading,
    error,
    filter,
    updateFilter,
    create,
    update,
    remove,
    refresh: fetchRepositories,
    isSyncing,
    syncRepository: handleSyncRepository,
    refreshAll,
  };
}
