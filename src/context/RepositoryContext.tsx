'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { Repository, RepositorySyncStatus, RepositoryFile } from '@/app/[locale]/[tenant]/repositories/types';
import { 
  getRepositories,
  getRepository as getRepositoryById,
  createRepository,
  updateRepository,
  getRepositoriesWithStarred
} from '@/app/[locale]/[tenant]/repositories/actions';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';
import { useRequestProtection } from '@/hooks/useRequestProtection';

// Reduce logging with a DEBUG flag
const DEBUG = true;
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
  connectionStatuses: {[key: string]: boolean};
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
  connectionStatuses: {[key: string]: boolean};
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
  }
};

// Create the context
export const RepositoryContext = createContext<RepositoryContextType | null>(null);

// Provider component
export const RepositoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  log('[RepositoryContext] RepositoryProvider initializing');
  
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
        sortDir: 'desc'
      }
    };
  });
  
  // Add request protection
  const { protectedFetch, safeUpdateState, renderCount } = useRequestProtection('RepositoryContext');
  
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

  // Fetch user data - use server action directly
  const fetchUserData = useCallback(async () => {
    log('[RepositoryContext] Fetching user data...');
    
    try {
      return await protectedFetch('fetchUserData', async () => {
        // Just get user data from the server action
        const userData = await getUser();
        if (userData) {
          log('[RepositoryContext] User data fetched successfully:', { 
            id: userData.id, 
            tenant: userData.tenant_name
          });
        } else {
          log('[RepositoryContext] No user data returned from server');
        }
        
        // Update state with user data
        safeUpdateState(
          setState,
          state,
          {
            ...state,
            currentUser: userData || null
          },
          'user-data-updated'
        );
        
        return userData;
      });
    } catch (error) {
      log('[RepositoryContext] Error fetching user data:', error);
      return null;
    }
  }, [protectedFetch, safeUpdateState, state]);
  
  // Fetch repositories safely with better null handling
  const fetchRepositories = useCallback(async (): Promise<Repository[]> => {
    const result = await protectedFetch('fetchRepositories', async () => {
      try {
        // Check for user data first
        const user = state.currentUser || await fetchUserData();
        if (!user) {
          console.log('[RepositoryContext] No user data available');
          safeUpdateState(
            setState,
            state,
            { 
              ...initialRepositoryData,
              loading: false,
              error: 'No user data available'
            },
            'no-user-data'
          );
          return [] as Repository[];
        }
        
        console.log('[RepositoryContext] Fetching repositories and starred repositories');
        safeUpdateState(
          setState,
          state,
          { ...state, loading: true, error: null },
          'start-loading'
        );
        
        // Use the combined action instead of separate calls
        const response = await getRepositoriesWithStarred();
        
        // Extract data from the combined response
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to fetch repositories');
        }
        
        const { repositories, starredRepositoryIds } = response.data;
        
        // Set connection status for each repository
        const connectionStatuses: {[key: string]: boolean} = {};
        repositories.forEach((repo: Repository) => {
          // Use a type assertion for isConnected since it might not be in the type
          connectionStatuses[repo.id] = (repo as any).isConnected || false;
        });
        
        // Sort by creation date (newest first)
        const sortedRepositories = [...repositories].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        // Convert starred repository IDs to full Repository objects
        const starredRepositories = sortedRepositories.filter(repo => 
          starredRepositoryIds.includes(repo.id)
        );
        
        console.log('[RepositoryContext] Repositories fetched:', sortedRepositories.length);
        console.log('[RepositoryContext] Starred repositories:', starredRepositories.length);
        
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
            error: null
          },
          'repositories-fetched'
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
            error: err.message || 'Failed to fetch repositories' 
          },
          'fetch-error'
        );
        return [] as Repository[];
      }
    });
    
    return result || [] as Repository[];
  }, [fetchUserData, state, protectedFetch, safeUpdateState]);
  
  // Filter repositories - fix URL optional check
  const filterRepositories = useCallback((options: RepositoryFilterOptions) => {
    const { searchTerm, filterConnected } = options;
    
    let filtered = state.repositories;
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(repo => 
        repo.name.toLowerCase().includes(term) || 
        (repo.url && repo.url.toLowerCase().includes(term))
      );
    }
    
    // Filter by connection status
    if (filterConnected) {
      filtered = filtered.filter(repo => state.connectionStatuses[repo.id]);
    }
    
    safeUpdateState(
      setState,
      { ...state, filteredRepositories: state.filteredRepositories },
      { ...state, filteredRepositories: filtered },
      'filter-applied'
    );
  }, [state, safeUpdateState]);
  
  // Toggle star status for a repository
  const toggleStarRepository = useCallback((repository: Repository) => {
    const isStarred = state.starredRepositories.some(r => r.id === repository.id);
    
    const newStarredRepositories = isStarred
      ? state.starredRepositories.filter(r => r.id !== repository.id)
      : [...state.starredRepositories, repository];
    
    safeUpdateState(
      setState,
      { ...state, starredRepositories: state.starredRepositories },
      { ...state, starredRepositories: newStarredRepositories },
      'star-toggled'
    );
  }, [state, safeUpdateState]);

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
      await fetchUserData();
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
      initialized.current = false;
    };
  }, [fetchUserData, fetchRepositories]);

  // Add one useful log when data is loaded
  useEffect(() => {
    if (state.repositories.length > 0 && !state.loading) {
      console.log('[RepositoryContext] Repositories loaded:', { 
        count: state.repositories.length,
        filtered: state.filteredRepositories.length
      });
    }
  }, [state.repositories.length, state.filteredRepositories.length, state.loading]);

  // Create context value
  const contextValue: RepositoryContextType = {
    ...state,
    refreshRepositories: async () => { await fetchRepositories(); },
    filterRepositories,
    toggleStarRepository
  };
  
  return (
    <RepositoryContext.Provider value={contextValue}>
      {children}
    </RepositoryContext.Provider>
  );
};

// Hook to use the context
export function useRepositoryContext() {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error('useRepositoryContext must be used within a RepositoryProvider');
  }
  return context;
} 