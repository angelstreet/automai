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
  RepositorySyncStatus,
  RepositoryFile,
} from '@/app/[locale]/[tenant]/repositories/types';
import {
  getRepositories,
  getRepository as getRepositoryById,
  createRepository,
  updateRepository,
  getRepositoriesWithStarred,
} from '@/app/[locale]/[tenant]/repositories/actions';
import { AuthUser } from '@/types/user';
import { useRequestProtection } from '@/hooks/useRequestProtection';
import { persistedData } from './AppContext';
import { useUser } from './UserContext'; // Import directly from UserContext to avoid circular dependency

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

// Define Repository data structure locally to avoid conflicts
interface RepositoryData {
  repositories: Repository[];
  filteredRepositories: Repository[];
  starredRepositories: Repository[];
  loading: boolean;
  error: string | null;
  connectionStatuses: { [key: string]: boolean };
  currentUser: AuthUser | null;
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

// Rename the initial state constant to avoid naming conflicts
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
      console.warn(
        '[RepositoryContext] Multiple instances of RepositoryProvider detected. ' +
          'This can cause performance issues and unexpected behavior. ' +
          'Ensure that RepositoryProvider is only used once in the component tree, ' +
          'preferably in the AppProvider.',
      );
    } else {
      REPOSITORY_CONTEXT_INITIALIZED = true;
      log('[RepositoryContext] RepositoryProvider initialized as singleton');
    }

    return () => {
      // Only reset on the instance that set it to true
      if (REPOSITORY_CONTEXT_INITIALIZED) {
        REPOSITORY_CONTEXT_INITIALIZED = false;
        log('[RepositoryContext] RepositoryProvider singleton instance unmounted');
      }
    };
  }, []);

  // Get user data from UserContext instead of fetching directly
  const userContext = useUser();

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
    return {
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
        sortBy: 'created_at',
        sortDir: 'desc',
      },
    };
  });

  // Add request protection
  const { protectedFetch, safeUpdateState, renderCount } =
    useRequestProtection('RepositoryContext');

  // Add initialization tracker
  const initialized = useRef(false);

  // Update local state with user data from UserContext
  useEffect(() => {
    // Add null check for userContext
    if (userContext?.user && userContext.user !== state.currentUser) {
      log('[RepositoryContext] Updating user data from UserContext:', {
        id: userContext.user.id,
        tenant: userContext.user.tenant_name,
        role: userContext.user.role,
      });
      setState((prevState) => ({
        ...prevState,
        currentUser: userContext.user,
      }));
    }
  }, [userContext?.user, state.currentUser]);

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

  // Get user data from UserContext or state
  const getUserData = useCallback((): AuthUser | null => {
    // First try to get from state
    if (state.currentUser) {
      return state.currentUser;
    }

    // Then try from UserContext - add null check
    if (userContext?.user) {
      return userContext.user;
    }

    return null;
  }, [state.currentUser, userContext?.user]);

  // Refresh user data (now just gets it from UserContext)
  const fetchUserData = useCallback(async (): Promise<AuthUser | null> => {
    log('[RepositoryContext] Getting user data...');

    try {
      // First check if we already have user data
      const user = getUserData();
      if (user) {
        log('[RepositoryContext] Using existing user data:', {
          id: user.id,
          tenant: user.tenant_name,
          source: userContext?.user && user === userContext.user ? 'UserContext' : 'state',
        });
        return user;
      }

      // If we don't have user data and UserContext has a refresh method, use it
      if (!user && userContext?.refreshUser) {
        log('[RepositoryContext] Refreshing user data from UserContext');
        // Try to refresh it from UserContext
        await userContext.refreshUser();

        // Now check if it's available
        if (userContext?.user) {
          log('[RepositoryContext] User data refreshed successfully:', {
            id: userContext.user.id,
            tenant: userContext.user.tenant_name,
          });

          // Update state with user data
          safeUpdateState(
            setState,
            state,
            {
              ...state,
              currentUser: userContext.user,
            },
            'user-data-updated',
          );

          return userContext.user;
        }
      }

      log('[RepositoryContext] No user data available');
      return null;
    } catch (error) {
      log('[RepositoryContext] Error getting user data:', error);
      return null;
    }
  }, [getUserData, userContext, protectedFetch, safeUpdateState, state]);

  // Fetch repositories safely with better null handling
  const fetchRepositories = useCallback(async (): Promise<Repository[]> => {
    console.log('[RepositoryContext] Starting fetchRepositories...');
    const result = await protectedFetch('fetchRepositories', async () => {
      try {
        // Check for user data first
        const user = state.currentUser || (await fetchUserData());
        console.log('[RepositoryContext] User data:', user ? { id: user.id, tenant: user.tenant_name } : 'No user');
        
        if (!user) {
          console.log('[RepositoryContext] No user data available');
          safeUpdateState(
            setState,
            state,
            {
              ...initialRepositoryData,
              loading: false,
              error: 'No user data available',
            },
            'no-user-data',
          );
          return [] as Repository[];
        }

        console.log('[RepositoryContext] Fetching repositories and starred repositories');
        safeUpdateState(setState, state, { ...state, loading: true, error: null }, 'start-loading');

        // Use the combined action instead of separate calls
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
  }, [fetchUserData, state, protectedFetch, safeUpdateState]);

  // Filter repositories - fix URL optional check
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

  // Initialize by fetching user data and repositories
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

        // Skip fetching if we already have data
        return;
      }

      // Check for cached local storage data
      const hasCachedData =
        typeof window !== 'undefined' && localStorage.getItem('cached_repository') !== null;

      if (hasCachedData) {
        log('[RepositoryContext] Using cached repository data from localStorage');
        // We'll still fetch to refresh in background, but won't block UI
      }

      // Use user data from UserContext if available
      log('[RepositoryContext] Checking for user data...');
      if (!state.currentUser && userContext?.user) {
        log('[RepositoryContext] User data already available in UserContext:', {
          id: userContext.user.id,
          tenant: userContext.user.tenant_name,
        });
        // Update our state with the user from UserContext
        setState((prevState) => ({
          ...prevState,
          currentUser: userContext.user,
        }));
      } else if (!state.currentUser) {
        // If no user data in state or UserContext, try to fetch it
        await fetchUserData();
      }

      // Now fetch repositories
      await fetchRepositories();

      // Cache repository data in localStorage after successful fetch
      if (state.repositories.length > 0) {
        try {
          localStorage.setItem('cached_repository', JSON.stringify(state));
          localStorage.setItem('cached_repository_time', Date.now().toString());
          log('[RepositoryContext] Saved repository data to localStorage cache');
        } catch (e) {
          log('[RepositoryContext] Error saving to localStorage:', e);
        }
      }
    };

    initialize();

    return () => {
      log('[RepositoryContext] RepositoryContext unmounting...');
      // Don't reset initialized flag when component unmounts
    };
  }, [fetchUserData, fetchRepositories, state, userContext?.user]);

  // Add one useful log when data is loaded
  useEffect(() => {
    if (state.repositories.length > 0 && !state.loading) {
      log('[RepositoryContext] Repositories loaded:', {
        count: state.repositories.length,
        filtered: state.filteredRepositories.length,
        userAvailable: !!userContext?.user,
      });
    }
  }, [state.repositories.length, state.filteredRepositories.length, state.loading, userContext?.user]);

  // Persist repository data for cross-page navigation
  useEffect(() => {
    if (typeof persistedData !== 'undefined') {
      persistedData.repositoryData = {
        repositories: state.repositories,
        loading: state.loading,
        error: state.error,
        // Include other state you want to persist
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

  // We're not using central context registration in the new architecture
  
  return <RepositoryContext.Provider value={contextValue}>{children}</RepositoryContext.Provider>;
};

// Hook to use the context
export function useRepository() {
  const context = useContext(RepositoryContext);

  // If the context is null for some reason, return a safe default object
  // This prevents destructuring errors in components
  if (!context) {
    console.warn(
      '[useRepository] Repository context is null, returning fallback. This should not happen if using the centralized context system.',
    );
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

// For backward compatibility
export function useRepositoryContext() {
  console.warn(
    'useRepositoryContext is deprecated, please use useRepository instead',
  );
  return useRepository();
}
