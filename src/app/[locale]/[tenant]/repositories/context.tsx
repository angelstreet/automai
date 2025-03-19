'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Repository, GitProvider } from './types';
import { getRepositories, getRepository, createRepository, updateRepository, deleteRepository, getGitProviders, getGitProvider } from './actions';
import { AuthUser } from '@/types/user';
import { getUser } from '@/app/actions/user';

// Define cache keys for different entities
const CACHE_KEYS = {
  REPOSITORIES: 'repositories',
  REPOSITORY: (id: string) => `repository-${id}`,
  GIT_PROVIDERS: 'git-providers',
  GIT_PROVIDER: (id: string) => `git-provider-${id}`,
};

// Define cache TTL (time-to-live) in milliseconds
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Repository Context Type
interface RepositoryContextType {
  // State
  repositories: Repository[];
  gitProviders: GitProvider[];
  selectedRepository: Repository | null;
  loading: boolean;
  error: string | null;
  currentUser: AuthUser | null;
  
  // Actions
  fetchRepositories: () => Promise<Repository[]>;
  fetchRepository: (id: string) => Promise<Repository | null>;
  fetchGitProviders: () => Promise<GitProvider[]>;
  fetchGitProvider: (id: string) => Promise<GitProvider | null>;
  createRepositoryAction: (data: Partial<Repository>) => Promise<{ success: boolean; error?: string; data?: Repository }>;
  updateRepositoryAction: (id: string, updates: Partial<Repository>) => Promise<{ success: boolean; error?: string; data?: Repository }>;
  deleteRepositoryAction: (id: string) => Promise<{ success: boolean; error?: string }>;
  setSelectedRepository: (repository: Repository | null) => void;
  fetchUserData: () => Promise<AuthUser | null>;
}

// Create Context
const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

// Provider Component
export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [gitProviders, setGitProviders] = useState<GitProvider[]>([]);
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  /**
   * Fetch user data from auth
   * Retrieves and caches the current user's authentication data
   */
  const fetchUserData = useCallback(async () => {
    try {
      const user = await getUser();
      setCurrentUser(user);
      return user;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }
  }, []);

  /**
   * Fetch all repositories
   * Returns repositories array and updates state
   */
  const fetchRepositories = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const result = await getRepositories();
      
      if (!result.success) {
        setError(result.error || 'Failed to fetch repositories');
        return [];
      }
      
      const data = result.data || [];
      setRepositories(data);
      return data;
    } catch (err) {
      const errorMessage = 'Failed to fetch repositories';
      setError(errorMessage);
      console.error('Error fetching repositories:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  /**
   * Fetch a single repository by ID
   * Returns repository and optionally updates selected repository
   */
  const fetchRepository = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const result = await getRepository(id);
      
      if (!result.success) {
        setError(result.error || `Failed to fetch repository ${id}`);
        return null;
      }
      
      const repositoryData = result.data || null;
      return repositoryData;
    } catch (err) {
      const errorMessage = `Failed to fetch repository ${id}`;
      setError(errorMessage);
      console.error('Error fetching repository:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  /**
   * Fetch all git providers
   * Returns providers array and updates state
   */
  const fetchGitProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const result = await getGitProviders();
      
      if (!result.success) {
        setError(result.error || 'Failed to fetch git providers');
        return [];
      }
      
      const data = result.data || [];
      setGitProviders(data);
      return data;
    } catch (err) {
      const errorMessage = 'Failed to fetch git providers';
      setError(errorMessage);
      console.error('Error fetching git providers:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  /**
   * Fetch a single git provider by ID
   * Returns provider data
   */
  const fetchGitProvider = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const result = await getGitProvider(id);
      
      if (!result.success) {
        setError(result.error || `Failed to fetch git provider ${id}`);
        return null;
      }
      
      const providerData = result.data || null;
      return providerData;
    } catch (err) {
      const errorMessage = `Failed to fetch git provider ${id}`;
      setError(errorMessage);
      console.error('Error fetching git provider:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  /**
   * Create a new repository
   * Takes repository data and returns success status with optional repository
   */
  const createRepositoryAction = useCallback(async (data: Partial<Repository>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const result = await createRepository(data);
      
      if (!result.success) {
        setError(result.error || 'Failed to create repository');
        return { success: false, error: result.error };
      }
      
      // Refresh the repositories list after successful creation
      await fetchRepositories();
      
      return { success: true, data: result.data };
    } catch (err: any) {
      const errorMessage = 'Failed to create repository';
      setError(errorMessage);
      console.error('Error creating repository:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchUserData, fetchRepositories]);

  /**
   * Update an existing repository
   * Takes repository ID and update data
   */
  const updateRepositoryAction = useCallback(async (id: string, updates: Partial<Repository>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const result = await updateRepository(id, updates);
      
      if (!result.success) {
        setError(result.error || `Failed to update repository ${id}`);
        return { success: false, error: result.error };
      }
      
      // Refresh the repositories list after successful update
      await fetchRepositories();
      
      // If the updated repository is currently selected, update it
      if (selectedRepository && selectedRepository.id === id) {
        setSelectedRepository(result.data || null);
      }
      
      return { success: true, data: result.data };
    } catch (err: any) {
      const errorMessage = `Failed to update repository ${id}`;
      setError(errorMessage);
      console.error('Error updating repository:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchUserData, fetchRepositories, selectedRepository]);

  /**
   * Delete an existing repository
   * Takes repository ID and returns success status
   */
  const deleteRepositoryAction = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const result = await deleteRepository(id);
      
      if (!result.success) {
        setError(result.error || `Failed to delete repository ${id}`);
        return { success: false, error: result.error };
      }
      
      // Refresh the repositories list after successful deletion
      await fetchRepositories();
      
      // If the deleted repository is currently selected, clear selection
      if (selectedRepository && selectedRepository.id === id) {
        setSelectedRepository(null);
      }
      
      return { success: true };
    } catch (err: any) {
      const errorMessage = `Failed to delete repository ${id}`;
      setError(errorMessage);
      console.error('Error deleting repository:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchUserData, fetchRepositories, selectedRepository]);

  // Initialize - fetch user data first
  useEffect(() => {
    const initialize = async () => {
      await fetchUserData();
      await fetchRepositories();
      await fetchGitProviders();
    };
    
    initialize();
  }, [fetchUserData, fetchRepositories, fetchGitProviders]);

  // Provider value
  const value = {
    repositories,
    gitProviders,
    selectedRepository,
    loading,
    error,
    currentUser,
    fetchRepositories,
    fetchRepository,
    fetchGitProviders,
    fetchGitProvider,
    createRepositoryAction,
    updateRepositoryAction,
    deleteRepositoryAction,
    setSelectedRepository,
    fetchUserData,
  };

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
}

// Context Hook
export function useRepositories() {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error('useRepositories must be used within a RepositoryProvider');
  }
  return context;
}
