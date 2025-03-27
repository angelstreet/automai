'use client';

import { useCallback } from 'react';
import { getDeploymentsByTeam, createDeploymentWithTeam, updateDeploymentTeam } from '@/app/actions/deployments-team';
import { useTeam } from '@/context';
import { useToast } from '@/components/shadcn/use-toast';
import { useResourceLimit } from '@/hooks/useResourceLimit';
import type { Deployment } from '@/types/context/deployment';

/**
 * Hook for deployment operations with team integration
 * @returns Object with deployment-team operations
 */
export function useDeploymentTeamIntegration() {
  const { selectedTeam } = useTeam();
  const { toast } = useToast();
  const { checkAndNotify } = useResourceLimit();
  
  /**
   * Fetch deployments for the currently selected team
   * @returns Array of deployments or null if error
   */
  const fetchTeamDeployments = useCallback(async () => {
    if (!selectedTeam) {
      toast({
        title: 'No team selected',
        description: 'Please select a team to view deployments',
        variant: 'destructive'
      });
      return null;
    }
    
    try {
      const result = await getDeploymentsByTeam(selectedTeam.id);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        toast({
          title: 'Failed to fetch deployments',
          description: result.error || 'An unexpected error occurred',
          variant: 'destructive'
        });
        return null;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
      return null;
    }
  }, [selectedTeam, toast]);
  
  /**
   * Create a new deployment associated with the selected team
   * @param deploymentData Deployment data to create
   * @returns Created deployment or null if error
   */
  const createTeamDeployment = useCallback(async (
    deploymentData: Omit<Deployment, 'id' | 'created_at' | 'updated_at'>
  ) => {
    if (!selectedTeam) {
      toast({
        title: 'No team selected',
        description: 'Please select a team to create a deployment',
        variant: 'destructive'
      });
      return null;
    }
    
    // Check resource limit before creating
    const canCreate = await checkAndNotify('deployments');
    if (!canCreate) {
      return null;
    }
    
    try {
      const result = await createDeploymentWithTeam(deploymentData, selectedTeam.id);
      
      if (result.success && result.data) {
        toast({
          title: 'Deployment created',
          description: `Deployment ${deploymentData.name} has been created successfully`
        });
        return result.data;
      } else {
        toast({
          title: 'Failed to create deployment',
          description: result.error || 'An unexpected error occurred',
          variant: 'destructive'
        });
        return null;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
      return null;
    }
  }, [selectedTeam, toast, checkAndNotify]);
  
  /**
   * Update a deployment's team association
   * @param deploymentId Deployment ID to update
   * @param teamId Team ID to associate the deployment with
   * @returns Updated deployment or null if error
   */
  const moveDeploymentToTeam = useCallback(async (deploymentId: string, teamId: string) => {
    try {
      const result = await updateDeploymentTeam(deploymentId, teamId);
      
      if (result.success && result.data) {
        toast({
          title: 'Deployment moved',
          description: `Deployment has been moved to the selected team`
        });
        return result.data;
      } else {
        toast({
          title: 'Failed to move deployment',
          description: result.error || 'An unexpected error occurred',
          variant: 'destructive'
        });
        return null;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);
  
  return {
    fetchTeamDeployments,
    createTeamDeployment,
    moveDeploymentToTeam
  };
}