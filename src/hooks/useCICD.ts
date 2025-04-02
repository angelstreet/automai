'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useFetchQuery, useDataMutation } from '@/hooks/useQueryHelpers';

import {
  getCICDProviders,
  createCICDProvider,
  updateCICDProvider,
  deleteCICDProvider,
  testCICDProvider,
  getCICDJobs,
  runCICDJob,
} from '@/app/actions/cicdAction';
import { useToast } from '@/components/shadcn/use-toast';

import type { CICDProviderPayload } from '@/types/component/cicdComponentType';

/**
 * Hook for managing CICD functionality
 *
 * Provides functions for fetching, creating, updating, deleting, and testing CICD providers
 * Uses React Query for data fetching and caching
 */
export function useCICD() {
  const { toast } = useToast();

  // Get all CICD providers
  const {
    data: providersResponse,
    isLoading: isLoadingProviders,
    error: providersError,
    refetch: refetchProviders,
  } = useFetchQuery(['cicdProviders'], getCICDProviders);

  // Get CICD jobs
  const getJobsQuery = (providerId: string) => {
    return useFetchQuery(['cicdJobs', providerId], () => getCICDJobs(providerId), {
      enabled: !!providerId,
      queryKey: ['cicdJobs', providerId], // Add queryKey to satisfy type requirements
    });
  };

  // Create CICD provider mutation
  const createProviderMutation = useDataMutation(
    (data: CICDProviderPayload) => createCICDProvider(data),
    [['cicdProviders']],
    {
      onSuccess: (response) => {
        if (response.success) {
          toast({
            title: 'Success',
            description: 'CICD provider created successfully',
          });
        } else {
          toast({
            title: 'Error',
            description: response.error || 'Failed to create CICD provider',
            variant: 'destructive',
          });
        }
        return response;
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to create CICD provider',
          variant: 'destructive',
        });
      },
    },
  );

  // Update CICD provider mutation
  const updateProviderMutation = useDataMutation(
    ({ id, data }: { id: string; data: CICDProviderPayload }) => updateCICDProvider(id, data),
    [['cicdProviders']],
    {
      onSuccess: (response) => {
        if (response.success) {
          toast({
            title: 'Success',
            description: 'CICD provider updated successfully',
          });
        } else {
          toast({
            title: 'Error',
            description: response.error || 'Failed to update CICD provider',
            variant: 'destructive',
          });
        }
        return response;
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update CICD provider',
          variant: 'destructive',
        });
      },
    },
  );

  // Delete CICD provider mutation
  const deleteProviderMutation = useDataMutation(
    (id: string) => deleteCICDProvider(id),
    [['cicdProviders']],
    {
      onSuccess: (response) => {
        if (response.success) {
          toast({
            title: 'Success',
            description: 'CICD provider deleted successfully',
          });
        } else {
          toast({
            title: 'Error',
            description: response.error || 'Failed to delete CICD provider',
            variant: 'destructive',
          });
        }
        return response;
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete CICD provider',
          variant: 'destructive',
        });
      },
    },
  );

  // Test CICD provider connection
  const testProviderMutation = useDataMutation(
    (id: any) => testCICDProvider(id), // Cast to any to fix type mismatch
    [],
    {
      onSuccess: (response) => {
        if (response.success) {
          toast({
            title: 'Connection Successful',
            description: 'CICD provider connection verified',
          });
        } else {
          toast({
            title: 'Connection Failed',
            description: response.error || 'Could not connect to CICD provider',
            variant: 'destructive',
          });
        }
        return response;
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to test CICD provider connection',
          variant: 'destructive',
        });
      },
    },
  );

  // Run CICD job mutation
  const runJobMutation = useDataMutation(
    ({ providerId, jobId }: { providerId: string; jobId: string }) => runCICDJob(providerId, jobId),
    [['cicdJobs']],
    {
      onSuccess: (response) => {
        if (response.success) {
          toast({
            title: 'Success',
            description: 'Job started successfully',
          });
        } else {
          toast({
            title: 'Error',
            description: response.error || 'Failed to run job',
            variant: 'destructive',
          });
        }
        return response;
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to run job',
          variant: 'destructive',
        });
      },
    },
  );

  return {
    // Data
    providers: providersResponse?.data || [],

    // Status
    isLoading: isLoadingProviders,
    error: providersError,

    // Query functions
    getJobs: getJobsQuery,
    refetchProviders,

    // Mutation functions
    createProvider: createProviderMutation.mutateAsync,
    updateProvider: updateProviderMutation.mutateAsync,
    deleteProvider: deleteProviderMutation.mutateAsync,
    testProvider: testProviderMutation.mutateAsync,
    runJob: runJobMutation.mutateAsync,

    // Mutation status
    isCreating: createProviderMutation.isPending,
    isUpdating: updateProviderMutation.isPending,
    isDeleting: deleteProviderMutation.isPending,
    isTesting: testProviderMutation.isPending,
    isRunningJob: runJobMutation.isPending,
  };
}
