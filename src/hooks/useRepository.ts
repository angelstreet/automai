'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

import {
  getRepositories,
  getRepository,
  connectRepository as connectRepositoryAction,
  disconnectRepository as disconnectRepositoryAction,
  testGitRepository as testGitRepositoryAction,
} from '@/app/actions/repositoriesAction';
import { useToast } from '@/components/shadcn/use-toast';
import * as gitService from '@/lib/services/gitService';
import type { TestRepositoryInput } from '@/types/context/repositoryContextType';
let hookInstanceCounter = 0;
/**
 * Hook for managing repositories
 * Simplified to include only essential functionality
 */
export function useRepository(componentName = 'unknown') {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const instanceId = useRef(++hookInstanceCounter);
  const isMounted = useRef(false);
  // Log mount/unmount for debugging
  useEffect(() => {
    const currentInstanceId = instanceId.current;

    if (!isMounted.current) {
      console.log(
        `[@hook:useCICD:useCICD] Hook mounted #${currentInstanceId} in component: ${componentName}`,
      );
      isMounted.current = true;
    }

    return () => {
      console.log(
        `[@hook:useCICD:useCICD] Hook unmounted #${currentInstanceId} from component: ${componentName}`,
      );
    };
  }, [componentName]);
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
    try {
      // Before connecting, detect the default branch
      console.log('[useRepository] Detecting default branch for repository:', data.url);

      // Detect the default branch using our gitService
      const defaultBranch = await gitService.getRepositoryDefaultBranch(data.url);
      console.log(`[useRepository] Detected default branch: ${defaultBranch}`);

      // Add the default branch to the repository data
      const enhancedData = {
        ...data,
        defaultBranch, // This will be used in the server action
      };

      // Now connect with the enhanced data
      return await connectRepositoryMutation.mutateAsync(enhancedData);
    } catch (error) {
      console.error('[useRepository] Error detecting default branch:', error);
      // If branch detection fails, proceed with the original data
      // The server will use 'main' as the default
      return await connectRepositoryMutation.mutateAsync(data);
    }
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

  // Repository URL validation function that calls the API endpoint
  const testRepositoryUrl = async (
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

    // Add simple Git URL validation
    const gitUrlPattern = /^(https?:\/\/|git@)([^\/]+)\/(.+)(\.git)?$/;
    if (!gitUrlPattern.test(data.url)) {
      toast({
        title: 'URL Invalid',
        description: 'Please enter a valid Git repository URL',
        variant: 'destructive',
      });
      return { success: false, error: 'Invalid Git repository URL format' };
    }

    try {
      console.log('[useRepository] Testing repository URL:', data.url);

      // Call the server action directly instead of the API endpoint
      const result = await testGitRepositoryAction({
        url: data.url,
        token: data.token || '',
      });

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
    testRepositoryUrl,

    // Refetch functions
    refetchRepositories,

    // Mutation states
    isConnecting: connectRepositoryMutation.isPending,
    isDisconnecting: disconnectRepositoryMutation.isPending,
    isValidating: false,
  };
}
