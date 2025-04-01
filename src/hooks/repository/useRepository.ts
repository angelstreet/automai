'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRepositories,
  getRepositoryById,
  connectRepository,
  disconnectRepository,
  syncRepository,
  testRepositoryConnection,
  getGitProviders,
  createGitProvider,
  deleteGitProvider,
} from '@/app/actions/repositoriesAction';
import { useToast } from '@/components/shadcn/use-toast';
// Import component types for data models
import type {
  Repository,
  GitProvider
} from '@/types/component/repositoryComponentType';

// Import context types for UI-specific types and input types
import type {
  GitProviderCreateInput,
  TestRepositoryInput,
  RepositoryFilter
} from '@/types/context/repositoryContextType';

/**
 * Hook for managing repositories and git providers
 * 
 * Provides functions for fetching, connecting, and managing repositories and git providers
 * Uses React Query for data fetching and caching
 */
export function useRepository() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get all repositories
  const {
    data: repositoriesResponse,
    isLoading: isLoadingRepositories,
    error: repositoriesError,
    refetch: refetchRepositories,
  } = useQuery({
    queryKey: ['repositories'],
    queryFn: () => getRepositories(),
  });

  // Get filtered repositories
  const getFilteredRepositoriesQuery = (filter: RepositoryFilter) => {
    return useQuery({
      queryKey: ['repositories', filter],
      queryFn: () => getRepositories(filter),
    });
  };

  // Get repository by ID
  const getRepositoryQuery = (id: string) => {
    return useQuery({
      queryKey: ['repository', id],
      queryFn: () => getRepositoryById(id),
      enabled: !!id,
    });
  };

  // Get all git providers
  const {
    data: providersResponse,
    isLoading: isLoadingProviders,
    error: providersError,
    refetch: refetchProviders,
  } = useQuery({
    queryKey: ['gitProviders'],
    queryFn: getGitProviders,
  });

  // Connect repository mutation
  const connectRepositoryMutation = useMutation({
    mutationFn: (data: any) => connectRepository(data),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Repository connected successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['repositories'] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to connect repository',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to connect repository',
        variant: 'destructive',
      });
    },
  });

  // Disconnect repository mutation
  const disconnectRepositoryMutation = useMutation({
    mutationFn: (id: string) => disconnectRepository(id),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Repository disconnected successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['repositories'] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to disconnect repository',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect repository',
        variant: 'destructive',
      });
    },
  });

  // Sync repository mutation
  const syncRepositoryMutation = useMutation({
    mutationFn: (id: string) => syncRepository(id),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Repository synced successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['repositories'] });
        queryClient.invalidateQueries({ queryKey: ['repository', response.data?.id] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to sync repository',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync repository',
        variant: 'destructive',
      });
    },
  });

  // Test repository connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: (data: TestRepositoryInput) => testRepositoryConnection(data),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Connection Successful',
          description: 'Repository connection verified',
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: response.error || 'Could not connect to repository',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to test repository connection',
        variant: 'destructive',
      });
    },
  });

  // Create git provider mutation
  const createProviderMutation = useMutation({
    mutationFn: (data: GitProviderCreateInput) => createGitProvider(data),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Git provider created successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['gitProviders'] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to create git provider',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create git provider',
        variant: 'destructive',
      });
    },
  });

  // Delete git provider mutation
  const deleteProviderMutation = useMutation({
    mutationFn: (id: string) => deleteGitProvider(id),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Git provider deleted successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['gitProviders'] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to delete git provider',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete git provider',
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    repositories: repositoriesResponse?.data || [],
    gitProviders: providersResponse?.data || [],
    
    // Status
    isLoadingRepositories,
    isLoadingProviders,
    repositoriesError,
    providersError,
    
    // Query functions
    getRepositoryById: getRepositoryQuery,
    getFilteredRepositories: getFilteredRepositoriesQuery,
    refetchRepositories,
    refetchProviders,
    
    // Mutation functions
    connectRepository: connectRepositoryMutation.mutateAsync,
    disconnectRepository: disconnectRepositoryMutation.mutateAsync,
    syncRepository: syncRepositoryMutation.mutateAsync,
    testConnection: testConnectionMutation.mutateAsync,
    createGitProvider: createProviderMutation.mutateAsync,
    deleteGitProvider: deleteProviderMutation.mutateAsync,
    
    // Mutation status
    isConnecting: connectRepositoryMutation.isPending,
    isDisconnecting: disconnectRepositoryMutation.isPending,
    isSyncing: syncRepositoryMutation.isPending,
    isTesting: testConnectionMutation.isPending,
    isCreatingProvider: createProviderMutation.isPending,
    isDeletingProvider: deleteProviderMutation.isPending,
  };
}