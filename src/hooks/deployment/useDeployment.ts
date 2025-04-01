'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDeployments,
  getDeploymentById,
  createDeployment,
  updateDeployment,
  deleteDeployment,
  runDeployment,
} from '@/app/actions/deploymentsAction';
import { useToast } from '@/components/shadcn/use-toast';
import type { Deployment, DeploymentFormData } from '@/app/[locale]/[tenant]/deployment/types';

/**
 * Hook for managing deployments
 * 
 * Provides functions for fetching, creating, updating, deleting, and running deployments
 * Uses React Query for data fetching and caching
 */
export function useDeployment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get all deployments
  const {
    data: deploymentsResponse,
    isLoading: isLoadingDeployments,
    error: deploymentsError,
    refetch: refetchDeployments,
  } = useQuery({
    queryKey: ['deployments'],
    queryFn: () => getDeployments(),
  });

  // Get deployment by ID
  const getDeploymentQuery = (id: string) => {
    return useQuery({
      queryKey: ['deployment', id],
      queryFn: () => getDeploymentById(id),
      enabled: !!id,
    });
  };

  // Create deployment mutation
  const createDeploymentMutation = useMutation({
    mutationFn: (data: DeploymentFormData) => createDeployment(data),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Deployment created successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['deployments'] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to create deployment',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create deployment',
        variant: 'destructive',
      });
    },
  });

  // Update deployment mutation
  const updateDeploymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DeploymentFormData> }) => 
      updateDeployment(id, data),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Deployment updated successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['deployments'] });
        queryClient.invalidateQueries({ queryKey: ['deployment', response.data?.id] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to update deployment',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update deployment',
        variant: 'destructive',
      });
    },
  });

  // Delete deployment mutation
  const deleteDeploymentMutation = useMutation({
    mutationFn: (id: string) => deleteDeployment(id),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Deployment deleted successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['deployments'] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to delete deployment',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete deployment',
        variant: 'destructive',
      });
    },
  });

  // Run deployment mutation
  const runDeploymentMutation = useMutation({
    mutationFn: (id: string) => runDeployment(id),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Deployment started successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['deployments'] });
        queryClient.invalidateQueries({ queryKey: ['deployment', response.data?.id] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to run deployment',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to run deployment',
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    deployments: deploymentsResponse?.data || [],
    
    // Status
    isLoading: isLoadingDeployments,
    error: deploymentsError,
    
    // Query functions
    getDeploymentById: getDeploymentQuery,
    refetchDeployments,
    
    // Mutation functions
    createDeployment: createDeploymentMutation.mutateAsync,
    updateDeployment: updateDeploymentMutation.mutateAsync,
    deleteDeployment: deleteDeploymentMutation.mutateAsync,
    runDeployment: runDeploymentMutation.mutateAsync,
    
    // Mutation status
    isCreating: createDeploymentMutation.isPending,
    isUpdating: updateDeploymentMutation.isPending,
    isDeleting: deleteDeploymentMutation.isPending,
    isRunning: runDeploymentMutation.isPending,
  };
}