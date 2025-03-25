'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useRef,
  useMemo,
} from 'react';

import {
  Repository,
} from '@/app/[locale]/[tenant]/repositories/types';
import {
  getRepositoriesWithStarred,
} from '@/app/[locale]/[tenant]/repositories/actions';
import { useRequestProtection } from '@/hooks/useRequestProtection';
import { persistedData } from './AppContext';

// Singleton flag to prevent multiple instances
let REPOSITORY_CONTEXT_INITIALIZED = false;

// Reduce logging with a DEBUG flag
const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log(...args);

// Define interface for filter options
interface RepositoryFilterOptions {
  searchTerm?: string;
  filterConnected?: boolean;
}

// Define Repository data structure locally
interface RepositoryData {
  repositories: Repository[];
  filteredRepositories: Repository[];
  starredRepositories: Repository[];
  loading: boolean;
  error: string | null;
  connectionStatuses: { [key: string]: boolean };
  currentUser: any | null;
  filter: {
    query: string;
    status: string;
    type: string;
    sortBy: string;
    sortDir: string;
  };
}

interface RepositoryContextType {
  repositories: Repository[];
  filteredRepositories: Repository[];
  starredRepositories: Repository[];
  loading: boolean;
  error: string | null;
  connectionStatuses: { [key: string]: boolean };
  refreshRepositories: () => Promise<void>;
  filterRepositories: (options: RepositoryFilterOptions) => void;
  toggleStarRepository: (repository: Repository) => void;
}

// Initial state
const initialRepositoryData: RepositoryData = {
  repositories: [],
  filteredRepositories: [],
  starredRepositories: [],
  loading: false,
  error: null,
  currentUser: null,
  connectionStatuses: {},
  filter: {
    query: '',
    status: 'all',
    type: 'all',
    sortBy: 'name',
    sortDir: 'asc',
  },
};

// Create the context
export const RepositoryContext = createContext<RepositoryContextType | null>(null);

// Provider component
export const RepositoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  log('[RepositoryContext] RepositoryProvider initializing');

  // Check for multiple instances of RepositoryProvider
  useEffect(() => {
    if (REPOSITORY_CONTEXT_INITIALIZED) {
      console.warn('[RepositoryContext] Multiple instances of RepositoryProvider detected');
    } else {
      REPOSITORY_CONTEXT_INITIALIZED = true;
      log('[RepositoryContext] RepositoryProvider initialized as singleton');
    }

    return () => {
      if (REPOSITORY_CONTEXT_INITIALIZED) {
        REPOSITORY_CONTEXT_INITIALIZED = false;
        log('[RepositoryContext] RepositoryProvider singleton instance unmounted');
      }
    };
  }, []);

  // First, in the useState initializers, check for persisted data:
  const [repositories, setRepositories] = useState<Repository[]>(
    persistedData?.repositoryData?.repositories || [],
  );

  const [loading, setLoading] = useState<boolean>(
    persistedData?.repositoryData?.loading !== undefined
      ? persistedData.repositoryData.loading
      : true,
  );

  // Get initial repository data synchronously from localStorage
  const [state, setState] = useState<RepositoryData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem('cached_repository');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData) as RepositoryData;
          log('[RepositoryContext] Using initial cached repository data from localStorage');
          return parsedData;
        }
      } catch (e) {
        // Ignore localStorage errors
        log('[RepositoryContext] Error reading from localStorage:', e);
      }
    }
    return initialRepositoryData;
  });

  // Add request protection
  const { protectedFetch, safeUpdateState } = useRequestProtection('RepositoryContext');

  // Add initialization tracker
  const initialized = useRef(false);

  // Add repository caching to localStorage
  useEffect(() => {
    if (state.repositories.length > 0) {
      try {
        localStorage.setItem('cached_repository', JSON.stringify(state));
        localStorage.setItem('cached_repository_time', Date.now().toString());
        log('[RepositoryContext] Saved repository data to localStorage cache');
      } catch (e) {
        log('[RepositoryContext] Error saving to localStorage:', e);
      }
    }
  }, [state.repositories.length]);

  // Fetch repositories safely
  const fetchRepositories = useCallback(async (): Promise<Repository[]> => {
    console.log('[RepositoryContext] Starting fetchRepositories...');
    
    const result = await protectedFetch('fetchRepositories', async () => {
      try {
        console.log('[RepositoryContext] Fetching repositories and starred repositories');
        safeUpdateState(setState, state, { ...state, loading: true, error: null }, 'start-loading');

        // Use the combined action
        const response = await getRepositoriesWithStarred();
        console.log('[RepositoryContext] getRepositoriesWithStarred response:', {
          success: response.success,
          error: response.error,
          repoCount: response.data?.repositories?.length || 0,
          starredCount: response.data?.starredRepositoryIds?.length || 0
        });

        // Extract data from the combined response
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to fetch repositories');
        }

        const { repositories, starredRepositoryIds } = response.data;

        // Set connection status for each repository
        const connectionStatuses: { [key: string]: boolean } = {};
        repositories.forEach((repo: Repository) => {
          connectionStatuses[repo.id] = (repo as any).isConnected || false;
        });

        // Sort by creation date (newest first)
        const sortedRepositories = [...repositories].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Convert starred repository IDs to full Repository objects
        const starredRepositories = sortedRepositories.filter((repo) =>
          starredRepositoryIds.includes(repo.id),
        );

        console.log('[RepositoryContext] Final repository counts:', {
          total: sortedRepositories.length,
          starred: starredRepositories.length,
          connected: Object.values(connectionStatuses).filter(Boolean).length
        });

        safeUpdateState(
          setState,
          state,
          {
            ...state,
            repositories: sortedRepositories,
            filteredRepositories: sortedRepositories,
            starredRepositories: starredRepositories,
            connectionStatuses,
            loading: false,
            error: null,
          },
          'repositories-fetched',
        );

        return sortedRepositories;
      } catch (err: any) {
        console.error('[RepositoryContext] Error fetching repositories:', err);
        safeUpdateState(
          setState,
          state,
          {
            ...state,
            loading: false,
            error: err.message || 'Failed to fetch repositories',
          },
          'fetch-error',
        );
        return [] as Repository[];
      }
    });

    return result || ([] as Repository[]);
  }, [state, protectedFetch, safeUpdateState]);

  // Filter repositories
  const filterRepositories = useCallback(
    (options: RepositoryFilterOptions) => {
      const { searchTerm, filterConnected } = options;

      let filtered = state.repositories;

      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (repo) =>
            repo.name.toLowerCase().includes(term) ||
            (repo.url && repo.url.toLowerCase().includes(term)),
        );
      }

      // Filter by connection status
      if (filterConnected) {
        filtered = filtered.filter((repo) => state.connectionStatuses[repo.id]);
      }

      safeUpdateState(
        setState,
        { ...state, filteredRepositories: state.filteredRepositories },
        { ...state, filteredRepositories: filtered },
        'filter-applied',
      );
    },
    [state, safeUpdateState],
  );

  // Toggle star status for a repository
  const toggleStarRepository = useCallback(
    (repository: Repository) => {
      const isStarred = state.starredRepositories.some((r) => r.id === repository.id);

      const newStarredRepositories = isStarred
        ? state.starredRepositories.filter((r) => r.id !== repository.id)
        : [...state.starredRepositories, repository];

      safeUpdateState(
        setState,
        { ...state, starredRepositories: state.starredRepositories },
        { ...state, starredRepositories: newStarredRepositories },
        'star-toggled',
      );
    },
    [state, safeUpdateState],
  );

  // Initialize by fetching repositories
  useEffect(() => {
    log('[RepositoryContext] Initializing RepositoryContext...');

    const initialize = async () => {
      // Prevent double initialization
      if (initialized.current) {
        log('[RepositoryContext] Already initialized, skipping');
        return;
      }

      initialized.current = true;

      // First check if we have persisted data with repositories
      if (persistedData?.repositoryData?.repositories?.length > 0) {
        log(
          '[RepositoryContext] Using persisted repository data:',
          persistedData.repositoryData.repositories.length,
        );
        return;
      }

      // Check for cached local storage data
      const hasCachedData =
        typeof window !== 'undefined' && localStorage.getItem('cached_repository') !== null;

      if (hasCachedData) {
        log('[RepositoryContext] Using cached repository data from localStorage');
        // We'll still fetch to refresh in background, but won't block UI
      }

      // Now fetch repositories
      await fetchRepositories();
    };

    initialize();
  }, [fetchRepositories]);

  // Add one useful log when data is loaded
  useEffect(() => {
    if (state.repositories.length > 0 && !state.loading) {
      log('[RepositoryContext] Repositories loaded:', {
        count: state.repositories.length,
        filtered: state.filteredRepositories.length,
      });
    }
  }, [state.repositories.length, state.filteredRepositories.length, state.loading]);

  // Persist repository data for cross-page navigation
  useEffect(() => {
    if (typeof persistedData !== 'undefined') {
      persistedData.repositoryData = {
        repositories: state.repositories,
        loading: state.loading,
        error: state.error,
      };
      log('[RepositoryContext] Persisted repository data for cross-page navigation');
    }
  }, [state.repositories, state.loading, state.error]);

  // Create context value with proper memoization
  const contextValue = useMemo(
    () => ({
      repositories: state.repositories,
      filteredRepositories: state.filteredRepositories,
      starredRepositories: state.starredRepositories,
      loading: state.loading,
      error: state.error,
      connectionStatuses: state.connectionStatuses,
      refreshRepositories: async () => {
        await fetchRepositories();
      },
      filterRepositories,
      toggleStarRepository,
    }),
    [
      state.repositories,
      state.filteredRepositories,
      state.starredRepositories,
      state.loading,
      state.error,
      state.connectionStatuses,
      fetchRepositories,
      filterRepositories,
      toggleStarRepository,
    ],
  );
  
  return <RepositoryContext.Provider value={contextValue}>{children}</RepositoryContext.Provider>;
};

// Hook to use the context
export function useRepository() {
  const context = useContext(RepositoryContext);

  // If the context is null for some reason, return a safe default object
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
      toggleStarRepository: () => {},
    };
  }

  return context;
}
