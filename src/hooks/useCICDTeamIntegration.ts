'use client';

import { useCallback } from 'react';
import { getCICDProvidersByTeam, createCICDProviderWithTeam, updateCICDProviderTeam } from '@/app/actions/cicd-team';
import { useTeam } from '@/context';
import { useToast } from '@/components/shadcn/use-toast';
import { useResourceLimit } from '@/hooks/useResourceLimit';
import type { CICDProvider } from '@/types/context/cicd';

/**
 * Hook for CICD provider operations with team integration
 * @returns Object with CICD provider-team operations
 */
export function useCICDTeamIntegration() {
  const { selectedTeam } = useTeam();
  const { toast } = useToast();
  const { checkAndNotify } = useResourceLimit();
  
  /**
   * Fetch CICD providers for the currently selected team
   * @returns Array of CICD providers or null if error
   */
  const fetchTeamCICDProviders = useCallback(async () => {
    if (!selectedTeam) {
      toast({
        title: 'No team selected',
        description: 'Please select a team to view CICD providers',
        variant: 'destructive'
      });
      return null;
    }
    
    try {
      const result = await getCICDProvidersByTeam(selectedTeam.id);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        toast({
          title: 'Failed to fetch CICD providers',
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
   * Create a new CICD provider associated with the selected team
   * @param providerData CICD provider data to create
   * @returns Created CICD provider or null if error
   */
  const createTeamCICDProvider = useCallback(async (
    providerData: Omit<CICDProvider, 'id' | 'created_at' | 'updated_at'>
  ) => {
    if (!selectedTeam) {
      toast({
        title: 'No team selected',
        description: 'Please select a team to create a CICD provider',
        variant: 'destructive'
      });
      return null;
    }
    
    // Check resource limit before creating
    const canCreate = await checkAndNotify('cicd_providers');
    if (!canCreate) {
      return null;
    }
    
    try {
      const result = await createCICDProviderWithTeam(providerData, selectedTeam.id);
      
      if (result.success && result.data) {
        toast({
          title: 'CICD provider created',
          description: `CICD provider ${providerData.name} has been created successfully`
        });
        return result.data;
      } else {
        toast({
          title: 'Failed to create CICD provider',
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
   * Update a CICD provider's team association
   * @param providerId CICD provider ID to update
   * @param teamId Team ID to associate the CICD provider with
   * @returns Updated CICD provider or null if error
   */
  const moveCICDProviderToTeam = useCallback(async (providerId: string, teamId: string) => {
    try {
      const result = await updateCICDProviderTeam(providerId, teamId);
      
      if (result.success && result.data) {
        toast({
          title: 'CICD provider moved',
          description: `CICD provider has been moved to the selected team`
        });
        return result.data;
      } else {
        toast({
          title: 'Failed to move CICD provider',
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
    fetchTeamCICDProviders,
    createTeamCICDProvider,
    moveCICDProviderToTeam
  };
}