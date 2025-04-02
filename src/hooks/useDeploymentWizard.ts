'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import {
  getDeploymentWizardData,
  saveDeploymentConfiguration,
  startDeployment,
} from '@/app/actions/deploymentWizardAction';
import { useToast } from '@/components/shadcn/use-toast';

import type { DeploymentFormData } from '@/app/types/deployment';

/**
 * Hook for managing the deployment wizard
 *
 * Provides functions for getting wizard data and managing deployment configurations
 * Uses React Query for data fetching and caching
 */
export function useDeploymentWizard() {
  const { toast } = useToast();

  // Get all data needed for the deployment wizard
  const {
    data: wizardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['deploymentWizardData'],
    queryFn: getDeploymentWizardData,
  });

  // Save deployment configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: (data: DeploymentFormData) => saveDeploymentConfiguration(data),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Deployment configuration saved successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to save deployment configuration',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save deployment configuration',
        variant: 'destructive',
      });
    },
  });

  // Start deployment mutation
  const startDeploymentMutation = useMutation({
    mutationFn: (configId: string) => startDeployment(configId),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Deployment started successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to start deployment',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start deployment',
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    repositories: wizardData?.repositories || [],
    hosts: wizardData?.hosts || [],
    cicdProviders: wizardData?.cicdProviders || [],

    // Status
    isLoading,
    error,

    // Query functions
    refetchWizardData: refetch,

    // Mutation functions
    saveDeploymentConfiguration: saveConfigMutation.mutateAsync,
    startDeployment: startDeploymentMutation.mutateAsync,

    // Mutation status
    isSaving: saveConfigMutation.isPending,
    isStarting: startDeploymentMutation.isPending,
  };
}
