'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
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

// Initial state
const initialState: RepositoryData = {
  repositories: [],
  filteredRepositories: [],
  starredRepositories: [],
  selectedRepository: null,
  repoFiles: {},
  repoFileContents: {},
  connectionStatuses: {},
  loading: false,
  exploring: false,
  error: null,
  currentUser: null,
  filter: {
    query: '',
    status: 'all',
    provider: 'all',
    starred: false,
    sortBy: 'name',
    sortDir: 'asc'
  }
};

// Create context
const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

// Provider component
export const RepositoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RepositoryData>(initialState);
  
  // Fetch user data
  const refreshUserData = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const user = await getUser();
      setState(prev => ({ ...prev, currentUser: user }));
      return user;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }
  }, []);

  // Apply filters to repositories
  const applyFilters = useCallback((repositories: Repository[], filter = state.filter) => {
    let filtered = [...repositories];
    
    // Text search
    if (filter.query) {
      const query = filter.query.toLowerCase();
      filtered = filtered.filter(repo => 
        repo.name.toLowerCase().includes(query) || 
        (repo.description && repo.description.toLowerCase().includes(query))
      );
    }
    
    // Status filter
    if (filter.status !== 'all') {
      filtered = filtered.filter(repo => {
        const status = state.connectionStatuses[repo.id]?.status;
        if (filter.status === 'connected' && status === 'connected') return true;
        if (filter.status === 'disconnected' && status !== 'connected') return true;
        return false;
      });
    }
    
    // Provider filter
    if (filter.provider !== 'all') {
      filtered = filtered.filter(repo => repo.provider === filter.provider);
    }
    
    // Starred filter
    if (filter.starred) {
      const starredIds = state.starredRepositories.map(repo => repo.id);
      filtered = filtered.filter(repo => starredIds.includes(repo.id));
    }
    
    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (filter.sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (filter.sortBy === 'updated') {
        const dateA = new Date(a.updated_at).getTime();
        const dateB = new Date(b.updated_at).getTime();
        comparison = dateA - dateB;
      } else if (filter.sortBy === 'created') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        comparison = dateA - dateB;
      }
      
      return filter.sortDir === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [state.filter, state.connectionStatuses, state.starredRepositories]);

  // Update filters
  const updateFilter = useCallback((newFilter: Partial<typeof state.filter>) => {
    setState(prev => {
      const updatedFilter = { ...prev.filter, ...newFilter };
      const filteredRepositories = applyFilters(prev.repositories, updatedFilter);
      
      return {
        ...prev,
        filter: updatedFilter,
        filteredRepositories
      };
    });
  }, [applyFilters]);

  // Fetch all repositories
  const fetchRepositories = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Use cached user data when available
      const user = state.currentUser || await refreshUserData();
      
      const repos = await getRepositories(user);
      
      // Stub for starred repositories
      const starredReposIds = ['repo-1', 'repo-2']; // Example IDs
      const starredRepos = repos.filter(repo => starredReposIds.includes(repo.id));
      
      const filteredRepos = applyFilters(repos);
      
      setState(prev => ({ 
        ...prev, 
        repositories: repos, 
        starredRepositories: starredRepos,
        filteredRepositories: filteredRepos,
        loading: false 
      }));
      
      return repos;
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to load repositories', 
        loading: false 
      }));
      console.error('Error fetching repositories:', err);
      return [];
    }
  }, [state.currentUser, refreshUserData, applyFilters]);

  // Fetch repository by ID
  const getRepository = useCallback(async (id: string): Promise<Repository | null> => {
    try {
      // First check if we already have the repository in state
      const cachedRepo = state.repositories.find(repo => repo.id === id);
      if (cachedRepo) return cachedRepo;
      
      return await getRepositoryById(id);
    } catch (err) {
      console.error(`Error getting repository ${id}:`, err);
      return null;
    }
  }, [state.repositories]);

  // Connect a new repository
  const connect = useCallback(async (providerType: string, repoUrl: string, name: string, description?: string): Promise<{ success: boolean; repositoryId?: string; error?: string }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Create repository with required fields
      const repoData = {
        provider_type: providerType,
        url: repoUrl,
        name,
        description: description || ''
      };
      
      const result = await createRepository(repoData);
      
      if (result.success && result.data) {
        // Refresh the repositories list to include the new repository
        fetchRepositories();
        return { success: true, repositoryId: result.data.id };
      }
      
      setState(prev => ({ 
        ...prev, 
        error: result.error || 'Failed to connect repository', 
        loading: false 
      }));
      
      return { success: false, error: result.error || 'Failed to connect repository' };
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: err.message || 'An unexpected error occurred', 
        loading: false 
      }));
      
      return { success: false, error: err.message || 'An unexpected error occurred' };
    }
  }, [fetchRepositories]);

  // Refresh a repository
  const refresh = useCallback(async (id: string): Promise<{ success: boolean; repository?: Repository; error?: string }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await updateRepository(id, { updated_at: new Date().toISOString() });
      
      if (result.success && result.data) {
        // Update the repository in the local state
        setState(prev => {
          const updatedRepos = prev.repositories.map(r => 
            r.id === id ? result.data! : r
          );
          
          const starredRepos = prev.starredRepositories.map(r => 
            r.id === id ? result.data! : r
          );
          
          const filteredRepos = applyFilters(updatedRepos);
          
          return {
            ...prev,
            repositories: updatedRepos,
            starredRepositories: starredRepos,
            filteredRepositories: filteredRepos,
            loading: false,
            // If this was the selected repository, update it too
            selectedRepository: prev.selectedRepository?.id === id ? result.data : prev.selectedRepository
          };
        });
        
        return { success: true, repository: result.data };
      }
      
      setState(prev => ({ 
        ...prev, 
        error: result.error || 'Failed to refresh repository', 
        loading: false 
      }));
      
      return { success: false, error: result.error || 'Failed to refresh repository' };
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: err.message || 'An unexpected error occurred', 
        loading: false 
      }));
      
      return { success: false, error: err.message || 'An unexpected error occurred' };
    }
  }, [applyFilters]);

  // Star a repository
  const star = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Stub implementation
      console.log('starRepository not implemented yet');
      
      // Update starred repositories in state
      setState(prev => {
        const repo = prev.repositories.find(r => r.id === id);
        if (!repo) return prev;
        
        return {
          ...prev,
          starredRepositories: [...prev.starredRepositories, repo]
        };
      });
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to star repository' };
    }
  }, []);

  // Unstar a repository
  const unstar = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Stub implementation
      console.log('unstarRepository not implemented yet');
      
      // Update starred repositories in state
      setState(prev => ({
        ...prev,
        starredRepositories: prev.starredRepositories.filter(r => r.id !== id)
      }));
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to unstar repository' };
    }
  }, []);

  // Select a repository
  const selectRepository = useCallback((repository: Repository | null) => {
    setState(prev => ({ ...prev, selectedRepository: repository }));
    
    // If a repo is selected, fetch its files
    if (repository) {
      fetchFiles(repository.id);
    }
  }, []);

  // Explore repository contents
  const explore = useCallback(async (id: string): Promise<{ success: boolean; files?: RepositoryFile[]; error?: string }> => {
    setState(prev => ({ ...prev, exploring: true, error: null }));
    
    try {
      // Stub implementation
      console.log('exploreRepository not implemented yet');
      
      const mockFiles: RepositoryFile[] = [
        { name: 'README.md', path: 'README.md', type: 'file', size: 1024 },
        { name: 'src', path: 'src', type: 'directory' },
        { name: 'package.json', path: 'package.json', type: 'file', size: 512 }
      ];
      
      setState(prev => ({ ...prev, exploring: false }));
      
      return { success: true, files: mockFiles };
    } catch (err: any) {
      setState(prev => ({ ...prev, exploring: false }));
      
      return { success: false, error: err.message || 'Failed to explore repository' };
    }
  }, []);

  // Sync repository
  const sync = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Stub implementation
      console.log('syncRepository not implemented yet');
      
      setState(prev => ({ ...prev, loading: false }));
      
      // Refresh the repository data
      refresh(id);
      return { success: true };
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false }));
      
      return { success: false, error: err.message || 'Failed to sync repository' };
    }
  }, [refresh]);

  // Test repository connection
  const testConnection = useCallback(async (url: string, provider: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Stub implementation
      console.log('testRepositoryConnection not implemented yet');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to test connection' };
    }
  }, []);

  // Fetch files in a repository
  const fetchFiles = useCallback(async (repositoryId: string, path: string = ''): Promise<RepositoryFile[]> => {
    try {
      // Stub implementation
      console.log('getFilesInRepository not implemented yet');
      
      const mockFiles: RepositoryFile[] = [
        { name: 'README.md', path: 'README.md', type: 'file', size: 1024 },
        { name: 'src', path: 'src', type: 'directory' },
        { name: 'package.json', path: 'package.json', type: 'file', size: 512 }
      ];
      
      // Update files in state
      setState(prev => ({
        ...prev,
        repoFiles: {
          ...prev.repoFiles,
          [repositoryId]: mockFiles
        }
      }));
      
      return mockFiles;
    } catch (err) {
      console.error(`Error fetching files for repository ${repositoryId}:`, err);
      return [];
    }
  }, []);

  // Fetch file content
  const fetchFileContent = useCallback(async (repositoryId: string, path: string): Promise<string | null> => {
    try {
      // Stub implementation
      console.log('getFileContent not implemented yet');
      
      const mockContent = `# Repository ${repositoryId}\n\nThis is a mock file content for ${path}`;
      
      // Update file content in state
      setState(prev => ({
        ...prev,
        repoFileContents: {
          ...prev.repoFileContents,
          [`${repositoryId}:${path}`]: mockContent
        }
      }));
      
      return mockContent;
    } catch (err) {
      console.error(`Error fetching content for file ${path} in repository ${repositoryId}:`, err);
      return null;
    }
  }, []);

  // Initialize by fetching user data and repositories
  useEffect(() => {
    const initialize = async () => {
      await refreshUserData();
      fetchRepositories();
    };
    
    initialize();
  }, [refreshUserData, fetchRepositories]);

  // Create context value
  const contextValue: RepositoryContextType = {
    // State
    ...state,
    
    // Actions
    fetchRepositories,
    getRepository,
    connectRepository: connect,
    refreshRepository: refresh,
    starRepository: star,
    unstarRepository: unstar,
    selectRepository,
    exploreRepository: explore,
    syncRepository: sync,
    testConnection,
    fetchFiles,
    fetchFileContent,
    updateFilter,
    refreshUserData
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