'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getRepositories,
  getRepository,
  connectRepository as connectRepositoryAction,
  disconnectRepository as disconnectRepositoryAction,
  testGitRepository,
} from '@/app/actions/repositoriesAction';
import { useToast } from '@/components/shadcn/use-toast';
import type { TestRepositoryInput } from '@/types/context/repositoryContextType';

/**
 * Hook for managing repositories
 * Simplified to include only essential functionality
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

  // Get repository by ID
  const getRepositoryQuery = (id: string) => {
    return useQuery({
      queryKey: ['repository', id],
      queryFn: () => getRepository(id),
      enabled: !!id,
    });
  };

  // Connect repository mutation
  const connectRepositoryMutation = useMutation({
    mutationFn: (data: any) => connectRepositoryAction(data),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['repositories'] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to connect repository',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to connect repository',
        variant: 'destructive',
      });
    },
  });

  // Connect repository function that returns the result
  const connectRepository = async (data: any) => {
    return await connectRepositoryMutation.mutateAsync(data);
  };

  // Disconnect repository mutation
  const disconnectRepositoryMutation = useMutation({
    mutationFn: (id: string) => disconnectRepositoryAction(id),
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
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect repository',
        variant: 'destructive',
      });
    },
  });

  // Disconnect repository function that returns the result
  const disconnectRepository = async (id: string) => {
    return await disconnectRepositoryMutation.mutateAsync(id);
  };

  // Internal mutation for URL validation
  const _validateUrlMutation = useMutation({
    mutationFn: (data: TestRepositoryInput) => testGitRepository(data),
  });

  // Simplified URL validation function
  const validateRepositoryUrl = async (
    data: TestRepositoryInput,
  ): Promise<{
    success: boolean;
    error?: string;
    status?: number;
    message?: string;
  }> => {
    if (!data.url) {
      return { success: false, error: 'Repository URL is required' };
    }

    try {
      const result = await _validateUrlMutation.mutateAsync(data);

      // Show relevant toast based on result
      if (result.success) {
        toast({
          title: 'URL Valid',
          description: 'Repository URL is valid and accessible',
        });
      } else {
        toast({
          title: 'URL Invalid',
          description: result.error || 'Repository URL is not accessible',
          variant: 'destructive',
        });
      }

      return result;
    } catch (error: any) {
      toast({
        title: 'Validation Error',
        description: error.message || 'Failed to validate repository URL',
        variant: 'destructive',
      });

      return {
        success: false,
        error: error.message || 'Failed to validate repository URL',
      };
    }
  };

  // Test repository - calls validateRepositoryUrl
  const testRepository = async (
    data: TestRepositoryInput,
  ): Promise<{
    success: boolean;
    error?: string;
    status?: number;
    message?: string;
  }> => {
    return validateRepositoryUrl(data);
  };

  return {
    // Data and loading states
    repositories: repositoriesResponse?.data || [],
    isLoadingRepositories,
    repositoriesError,

    // Query functions
    getRepositoryQuery,

    // Action functions
    connectRepository,
    disconnectRepository,
    testRepository,
    validateRepositoryUrl,

    // Refetch functions
    refetchRepositories,

    // Mutation states
    isConnecting: connectRepositoryMutation.isPending,
    isDisconnecting: disconnectRepositoryMutation.isPending,
    isValidating: _validateUrlMutation.isPending,
  };
}
