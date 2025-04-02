'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getRepositories,
  getRepository,
  connectRepository,
  disconnectRepository,
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
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect repository',
        variant: 'destructive',
      });
    },
  });

  // Test repository connection mutation
  const testRepositoryMutation = useMutation({
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
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to test repository connection',
        variant: 'destructive',
      });
    },
  });

  return {
    // Data and loading states
    repositories: repositoriesResponse?.data || [],
    isLoadingRepositories,
    repositoriesError,

    // Query functions
    getRepositoryQuery,

    // Action functions
    connectRepository: connectRepositoryMutation.mutate,
    disconnectRepository: disconnectRepositoryMutation.mutate,
    testRepository: testRepositoryMutation.mutate,

    // Refetch functions
    refetchRepositories,

    // Mutation states
    isConnecting: connectRepositoryMutation.isPending,
    isDisconnecting: disconnectRepositoryMutation.isPending,
    isTesting: testRepositoryMutation.isPending,
  };
}
