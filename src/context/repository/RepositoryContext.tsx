'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Repository, GitProvider } from '@/app/[locale]/[tenant]/repositories/types';
import { 
  getRepositories, 
  getRepository, 
  createRepository, 
  updateRepository, 
  deleteRepository, 
  getGitProviders, 
  getGitProvider 
} from '@/app/[locale]/[tenant]/repositories/actions';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';
import { 
  RepositoryContextType, 
  RepositoryData, 
  RepositoryActions, 
  REPOSITORY_CACHE_KEYS 
} from '@/types/context/repository';

// Initial state
const initialState: RepositoryData = {
  repositories: [],
  gitProviders: [],
  selectedRepository: null,
  loading: false,
  error: null,
  currentUser: null
};

// Create the context
const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

// Provider component
export const RepositoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RepositoryData>(initialState);
  
  // Fetch user data
  const fetchUserData = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const user = await getUser();
      setState(prev => ({ ...prev, currentUser: user }));
      return user;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }
  }, []);

  // Fetch repositories
  const fetchRepositories = useCallback(async (): Promise<Repository[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await getRepositories();
      
      if (!result.success) {
        setState(prev => ({ 
          ...prev, 
          error: result.error || 'Failed to fetch repositories', 
          loading: false 
        }));
        return [];
      }
      
      const data = result.data || [];
      setState(prev => ({ 
        ...prev, 
        repositories: data, 
        loading: false 
      }));
      return data;
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to fetch repositories', 
        loading: false 
      }));
      console.error('Error fetching repositories:', err);
      return [];
    }
  }, []);

  // Fetch specific repository
  const fetchRepository = useCallback(async (id: string): Promise<Repository | null> => {
    try {
      const result = await getRepository(id);
      
      if (!result.success || !result.data) {
        return null;
      }
      
      return result.data;
    } catch (err) {
      console.error(`Error fetching repository ${id}:`, err);
      return null;
    }
  }, []);

  // Fetch Git providers
  const fetchGitProviders = useCallback(async (): Promise<GitProvider[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await getGitProviders();
      
      if (!result.success) {
        setState(prev => ({ 
          ...prev, 
          error: result.error || 'Failed to fetch Git providers', 
          loading: false 
        }));
        return [];
      }
      
      const data = result.data || [];
      setState(prev => ({ 
        ...prev, 
        gitProviders: data, 
        loading: false 
      }));
      return data;
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to fetch Git providers', 
        loading: false 
      }));
      console.error('Error fetching Git providers:', err);
      return [];
    }
  }, []);

  // Fetch specific Git provider
  const fetchGitProvider = useCallback(async (id: string): Promise<GitProvider | null> => {
    try {
      const result = await getGitProvider(id);
      
      if (!result.success || !result.data) {
        return null;
      }
      
      return result.data;
    } catch (err) {
      console.error(`Error fetching Git provider ${id}:`, err);
      return null;
    }
  }, []);

  // Create repository action
  const createRepositoryAction = useCallback(async (data: Partial<Repository>): Promise<{ 
    success: boolean; 
    error?: string; 
    data?: Repository 
  }> => {
    try {
      const result = await createRepository(data);
      
      if (result.success && result.data) {
        // Update local state with the new repository
        setState(prev => ({
          ...prev,
          repositories: [...prev.repositories, result.data]
        }));
        
        return { 
          success: true, 
          data: result.data 
        };
      }
      
      return { 
        success: false, 
        error: result.error || 'Failed to create repository' 
      };
    } catch (err: any) {
      return { 
        success: false, 
        error: err.message || 'An unexpected error occurred' 
      };
    }
  }, []);

  // Update repository action
  const updateRepositoryAction = useCallback(async (id: string, updates: Partial<Repository>): Promise<{ 
    success: boolean; 
    error?: string; 
    data?: Repository 
  }> => {
    try {
      const result = await updateRepository(id, updates);
      
      if (result.success && result.data) {
        // Update local state with the updated repository
        setState(prev => ({
          ...prev,
          repositories: prev.repositories.map(repo => 
            repo.id === id ? result.data : repo
          )
        }));
        
        return { 
          success: true, 
          data: result.data 
        };
      }
      
      return { 
        success: false, 
        error: result.error || 'Failed to update repository' 
      };
    } catch (err: any) {
      return { 
        success: false, 
        error: err.message || 'An unexpected error occurred' 
      };
    }
  }, []);

  // Delete repository action
  const deleteRepositoryAction = useCallback(async (id: string): Promise<{ 
    success: boolean; 
    error?: string 
  }> => {
    try {
      const result = await deleteRepository(id);
      
      if (result.success) {
        // Update local state by removing the deleted repository
        setState(prev => ({
          ...prev,
          repositories: prev.repositories.filter(repo => repo.id !== id)
        }));
        
        return { success: true };
      }
      
      return { 
        success: false, 
        error: result.error || 'Failed to delete repository' 
      };
    } catch (err: any) {
      return { 
        success: false, 
        error: err.message || 'An unexpected error occurred' 
      };
    }
  }, []);

  // Set selected repository
  const setSelectedRepository = useCallback((repository: Repository | null) => {
    setState(prev => ({
      ...prev,
      selectedRepository: repository
    }));
  }, []);

  // Initialize by fetching user data, repositories, and Git providers
  useEffect(() => {
    const initialize = async () => {
      await fetchUserData();
      await fetchRepositories();
      await fetchGitProviders();
    };
    
    initialize();
  }, [fetchUserData, fetchRepositories, fetchGitProviders]);

  // Combine all methods and state into context value
  const contextValue: RepositoryContextType = {
    // State
    ...state,
    
    // Actions
    fetchRepositories,
    fetchRepository,
    fetchGitProviders,
    fetchGitProvider,
    createRepositoryAction,
    updateRepositoryAction,
    deleteRepositoryAction,
    setSelectedRepository,
    fetchUserData
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