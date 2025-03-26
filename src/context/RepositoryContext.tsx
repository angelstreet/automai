'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { useRepositoriesWithStarred } from '@/hooks/useRepositoryData';
import { toggleStar, refreshRepositories } from '@/hooks/useRepositoryData';
import type { Repository } from '@/app/[locale]/[tenant]/repositories/types';

// Define context type
interface RepositoryContextType {
  repositories: Repository[];
  filteredRepositories: Repository[];
  starredRepositories: Repository[];
  loading: boolean;
  error: string | null;
  connectionStatuses: { [key: string]: boolean };
  refreshRepositories: () => Promise<void>;
  filterRepositories: (options: any) => void;
  toggleStarRepository: (repository: Repository) => Promise<void>;
}

// Create context
const RepositoryContext = createContext<RepositoryContextType | null>(null);

// Provider component
export function RepositoryProvider({ children }: { children: ReactNode }) {
  // Use SWR hook
  const { data, error, mutate } = useRepositoriesWithStarred();

  // Local state for filtering
  const [filter, setFilter] = useState({
    query: '',
    status: 'all',
    type: 'all',
    sortBy: 'name',
    sortDir: 'asc',
  });

  // Extract repositories and starred IDs from data
  const repositories = useMemo(() => data?.repositories || [], [data?.repositories]);

  const starredRepositoryIds = useMemo(
    () => data?.starredRepositoryIds || [],
    [data?.starredRepositoryIds],
  );

  // Calculate derived data
  const starredRepositories = useMemo(
    () => repositories.filter((repo) => starredRepositoryIds.includes(repo.id)),
    [repositories, starredRepositoryIds],
  );

  const filteredRepositories = useMemo(() => {
    let filtered = [...repositories];

    // Text search filter
    if (filter.query) {
      const query = filter.query.toLowerCase();
      filtered = filtered.filter(
        (repo) =>
          repo.name.toLowerCase().includes(query) ||
          (repo.url && repo.url.toLowerCase().includes(query)),
      );
    }

    // Type filter
    if (filter.type !== 'all') {
      filtered = filtered.filter((repo) => repo.providerType === filter.type);
    }

    // Sorting
    filtered.sort((a, b) => {
      if (filter.sortBy === 'name') {
        return filter.sortDir === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return 0;
    });

    return filtered;
  }, [repositories, filter]);

  // Connection statuses
  const connectionStatuses = useMemo(() => {
    const statuses: { [key: string]: boolean } = {};
    repositories.forEach((repo) => {
      statuses[repo.id] = repo.syncStatus === 'SYNCED';
    });
    return statuses;
  }, [repositories]);

  // Methods
  const filterRepositories = useCallback((options: any) => {
    setFilter((prev) => ({ ...prev, ...options }));
  }, []);

  const handleRefreshRepositories = useCallback(async () => {
    await refreshRepositories();
    await mutate();
  }, [mutate]);

  const handleToggleStar = useCallback(
    async (repository: Repository) => {
      const isStarred = starredRepositoryIds.includes(repository.id);
      await toggleStar(repository, isStarred);
      await mutate();
    },
    [starredRepositoryIds, mutate],
  );

  // Create context value
  const contextValue = useMemo(
    () => ({
      repositories,
      filteredRepositories,
      starredRepositories,
      loading: !data && !error,
      error: error ? String(error) : null,
      connectionStatuses,
      refreshRepositories: handleRefreshRepositories,
      filterRepositories,
      toggleStarRepository: handleToggleStar,
    }),
    [
      repositories,
      filteredRepositories,
      starredRepositories,
      data,
      error,
      connectionStatuses,
      handleRefreshRepositories,
      filterRepositories,
      handleToggleStar,
    ],
  );

  return <RepositoryContext.Provider value={contextValue}>{children}</RepositoryContext.Provider>;
}

// Hook to use the context
export function useRepository() {
  const context = useContext(RepositoryContext);

  if (!context) {
    console.warn('[useRepository] Repository context is null, returning fallback');
    return {
      repositories: [],
      filteredRepositories: [],
      starredRepositories: [],
      loading: true,
      error: null,
      connectionStatuses: {},
      refreshRepositories: async () => {},
      filterRepositories: () => {},
      toggleStarRepository: async () => {},
    };
  }

  return context;
}
