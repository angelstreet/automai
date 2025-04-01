'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import type { 
  CICDProviderPayload, 
  CICDProvider,
  CICDJob
} from '@/app/[locale]/[tenant]/cicd/types';

/**
 * Hook for managing CICD functionality
 * 
 * Provides functions for fetching, creating, updating, deleting, and testing CICD providers
 * Uses React Query for data fetching and caching
 */
export function useCICD() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get all CICD providers
  const {
    data: providersResponse,
    isLoading: isLoadingProviders,
    error: providersError,
    refetch: refetchProviders,
  } = useQuery({
    queryKey: ['cicdProviders'],
    queryFn: getCICDProviders,
  });

  // Get CICD jobs
  const getJobsQuery = (providerId: string) => {
    return useQuery({
      queryKey: ['cicdJobs', providerId],
      queryFn: () => getCICDJobs(providerId),
      enabled: !!providerId,
    });
  };

  // Create CICD provider mutation
  const createProviderMutation = useMutation({
    mutationFn: (data: CICDProviderPayload) => createCICDProvider(data),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'CICD provider created successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['cicdProviders'] });
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
  });

  // Update CICD provider mutation
  const updateProviderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CICDProviderPayload }) => 
      updateCICDProvider(id, data),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'CICD provider updated successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['cicdProviders'] });
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
  });

  // Delete CICD provider mutation
  const deleteProviderMutation = useMutation({
    mutationFn: (id: string) => deleteCICDProvider(id),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'CICD provider deleted successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['cicdProviders'] });
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
  });

  // Test CICD provider connection
  const testProviderMutation = useMutation({
    mutationFn: (id: string) => testCICDProvider(id),
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
  });

  // Run CICD job mutation
  const runJobMutation = useMutation({
    mutationFn: ({ providerId, jobId }: { providerId: string; jobId: string }) => 
      runCICDJob(providerId, jobId),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Job started successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['cicdJobs'] });
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
  });

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