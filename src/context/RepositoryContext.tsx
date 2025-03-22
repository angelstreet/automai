'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { Repository, RepositoryConnectionStatus, RepositoryFile } from '@/app/[locale]/[tenant]/repositories/types';
import { 
  getRepositories,
  getRepository as getRepositoryById,
  createRepository,
  updateRepository
} from '@/app/[locale]/[tenant]/repositories/actions';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';
import { RepositoryContextType, RepositoryData, RepositoryActions } from '@/types/context/repository';
import { useRequestProtection } from '@/hooks/useRequestProtection';
import { useUser } from './UserContext';

// Reduce logging with a DEBUG flag
const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log(...args);

// Define Repository type if not imported
interface RepositoryData {
  repositories: Repository[];
  filteredRepositories: Repository[];
  starredRepositories: Repository[];
  loading: boolean;
  error: string | null;
  connectionStatuses: {[key: string]: boolean};
  currentUser?: AuthUser;
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
  const [initialState, setInitialState] = useState<RepositoryData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedRepos = localStorage.getItem('cached_repositories');
        if (cachedRepos) {
          const parsedRepos = JSON.parse(cachedRepos);
          log('[RepositoryContext] Using initial cached repository data from localStorage');
          return parsedRepos;
        }
      } catch (e) {
        // Ignore localStorage errors
        log('[RepositoryContext] Error reading from localStorage:', e);
      }
    }
    return initialRepositoryData;
  });
  
  const [state, setState] = useState<RepositoryData>(initialState);
  const renderCount = useRef<number>(0);
  
  // Add request protection
  const { protectedFetch, safeUpdateState, renderCount: protectedRenderCount } = useRequestProtection('RepositoryContext');
  
  // Add initialization tracker
  const initialized = useRef(false);
  
  // Fetch user data
  const refreshUserData = useCallback(async (): Promise<AuthUser | null> => {
    return await protectedFetch('fetchUserData', async () => {
      try {
        const user = await getUser();
        
        safeUpdateState(
          setState,
          { ...state, currentUser: state.currentUser },
          { ...state, currentUser: user },
          'currentUser'
        );
        
        return user;
      } catch (err) {
        console.error('Error fetching user data:', err);
        return null;
      }
    });
  }, [protectedFetch, safeUpdateState, state]);
  
  // Fetch repositories safely
  const fetchRepositories = useCallback(async (): Promise<Repository[]> => {
    return await protectedFetch('fetchRepositories', async () => {
      try {
        // Check for user data first
        const user = state.currentUser || await refreshUserData();
        if (!user) {
          console.log('[RepositoryContext] No user data available');
          safeUpdateState(
            setState,
            state,
            { 
              ...initialState,
              loading: false,
              error: 'No user data available'
            },
            'no-user-data'
          );
          return [];
        }
        
        console.log('[RepositoryContext] Fetching repositories');
        safeUpdateState(
          setState,
          state,
          { ...state, loading: true, error: null },
          'start-loading'
        );
        
        const data = await getRepositories();
        
        // Set connection status for each repository
        const connectionStatuses: {[key: string]: boolean} = {};
        data.forEach(repo => {
          connectionStatuses[repo.id] = repo.isConnected || false;
        });
        
        // Sort by creation date (newest first)
        const sortedRepositories = [...data].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        safeUpdateState(
          setState,
          { 
            ...state, 
            repositories: state.repositories,
            filteredRepositories: state.filteredRepositories,
            connectionStatuses: state.connectionStatuses
          },
          {
            ...state,
            repositories: sortedRepositories,
            filteredRepositories: sortedRepositories,
            connectionStatuses,
            loading: false,
            error: null
          },
          'repositories-fetched'
        );
        
        console.log('[RepositoryContext] Repositories fetched:', sortedRepositories.length);
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
        return [];
      }
    });
  }, [state, safeUpdateState, protectedFetch, refreshUserData]);
  
  // Filter repositories
  const filterRepositories = useCallback((options: RepositoryFilterOptions) => {
    const { searchTerm, filterConnected } = options;
    
    let filtered = state.repositories;
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(repo => 
        repo.name.toLowerCase().includes(term) || 
        repo.url.toLowerCase().includes(term)
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
      await refreshUserData();
      await fetchRepositories();
      
      // Cache repository data in localStorage after successful fetch
      if (state.repositories.length > 0) {
        try {
          localStorage.setItem('cached_repositories', JSON.stringify(state));
          localStorage.setItem('cached_repositories_time', Date.now().toString());
          log('[RepositoryContext] Saved repositories to localStorage cache');
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
  }, [refreshUserData]);

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
    refreshRepositories: fetchRepositories,
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