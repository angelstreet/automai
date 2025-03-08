'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  getRepositories, 
  createRepository, 
  updateRepository, 
  deleteRepository,
  Repository,
  RepositoryFilter
} from '@/app/actions/repositories';

export function useRepositories(initialFilter?: RepositoryFilter) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<RepositoryFilter | undefined>(initialFilter);

  const fetchRepositories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRepositories(filter);
      setRepositories(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch repositories'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

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

  return {
    repositories,
    loading,
    error,
    filter,
    updateFilter,
    create,
    update,
    remove,
    refresh: fetchRepositories
  };
}
