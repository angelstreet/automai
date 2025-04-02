'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRepositories,
  getRepository,
  connectRepository,
  disconnectRepository,
  testGitRepository,
  testGitProvider,
  clearRepositoriesCache,
} from '@/app/actions/repositoriesAction';
import { useToast } from '@/components/shadcn/use-toast';
// Import component types for data models
import type { Repository, GitProvider } from '@/types/component/repositoryComponentType';

// Import context types for UI-specific types and input types
import type {
  GitProviderCreateInput,
  TestRepositoryInput,
  RepositoryFilter,
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
      queryFn: () => getRepository(id),
      enabled: !!id,
    });
  };

  // Git providers can be fetched from a different endpoint if needed
  // For now, let's provide a simple empty array to avoid errors
  const providersResponse = { success: true, data: [] };
  const isLoadingProviders = false;
  const providersError = null;
  const refetchProviders = () => Promise.resolve({ success: true, data: [] });

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

  // We've removed syncRepository, but we can use connectRepository to reconnect a repository
  // if synchronization is needed
  const syncRepositoryMutation = useMutation({
    mutationFn: async (id: string) => {
      // First get the repository details
      const repo = await getRepository(id);
      if (!repo.success || !repo.data) {
        return { success: false, error: 'Repository not found' };
      }

      // Then use connectRepository with the same data to "reconnect" it
      // This is a temporary solution until a proper sync function is implemented
      return connectRepository(repo.data);
    },
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
    mutationFn: (data: TestRepositoryInput) => testGitRepository(data),
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

  // Function to clear the repositories cache
  const clearCache = async () => {
    const result = await clearRepositoriesCache();
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      toast({
        title: 'Cache Cleared',
        description: 'Repository cache has been cleared',
      });
    } else {
      toast({
        title: 'Error',
        description: result.message || 'Failed to clear cache',
        variant: 'destructive',
      });
    }
    return result;
  };

  return {
    // Data and loading states
    repositories: repositoriesResponse?.data || [],
    isLoadingRepositories,
    repositoriesError,
    providers: providersResponse?.data || [],
    isLoadingProviders,
    providersError,

    // Query functions
    getFilteredRepositoriesQuery,
    getRepositoryQuery,

    // Action functions
    connectRepository: connectRepositoryMutation.mutate,
    disconnectRepository: disconnectRepositoryMutation.mutate,
    syncRepository: syncRepositoryMutation.mutate,
    testGitRepository: testConnectionMutation.mutate,
    testGitProvider,
    clearCache,

    // Refetch functions
    refetchRepositories,
    refetchProviders,

    // Mutation states
    isConnecting: connectRepositoryMutation.isPending,
    isDisconnecting: disconnectRepositoryMutation.isPending,
    isSyncing: syncRepositoryMutation.isPending,
    isTesting: testConnectionMutation.isPending,
  };
}
