'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useContext } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { UserContext } from '@/context/UserContext';
import { useHost } from '@/hooks';
import { useRepository } from '@/hooks/useRepository';
import { useTeam } from '@/hooks/useTeam';
import { useUser } from '@/hooks/useUser';
import { Deployment } from '@/types/component/deploymentComponentType';
import { Repository } from '@/types/component/repositoryComponentType';

import DeploymentWizardMainClient from './DeploymentWizardMainClient';

interface DeploymentWizardDialogClientProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (deployment: Deployment) => void;
  repositories?: Repository[];
}

export function DeploymentWizardDialogClient({
  open,
  onOpenChange,
  onSuccess,
  repositories: initialRepositories,
}: DeploymentWizardDialogClientProps) {
  const t = useTranslations('deployment');
  const { hosts, isLoading: isLoadingHosts } = useHost('DeploymentWizardDialogClient');
  const { activeTeam } = useTeam('DeploymentWizardDialogClient');
  const { user } = useUser(null, 'DeploymentWizardDialogClient');

  // Only use the repository hook if no repositories were provided
  const { repositories: fetchedRepositories, isLoadingRepositories } = useRepository(
    'DeploymentWizardDialogClient',
  );

  // Use the provided repositories if available, otherwise use the fetched ones
  const repositories = initialRepositories || fetchedRepositories || [];

  // Define the combined loading state
  const isLoading = isLoadingHosts || isLoadingRepositories;

  const handleDeploymentCreated = () => {
    // Close the dialog
    onOpenChange(false);

    // Server actions handle revalidation internally - no need for router.refresh()

    // Call success callback if provided
    if (onSuccess) {
      // Since we don't have the actual deployment data here,
      // we'll pass a placeholder. The recipient can refresh
      // to get the actual data.
      onSuccess({} as Deployment);
    }
  };

  // Get user directly from context (more reliable method)
  const { user: contextUser } = useContext(UserContext);

  // Add an effect to log both user sources when dialog opens
  useEffect(() => {
    if (open) {
      console.log('[DeploymentWizardDialogClient] Dialog opened - User data comparison:', {
        isOpen: open,
        // Hook data
        hookUserExists: !!user,
        hookUserId: user?.id,
        hookTenantName: (user as any)?.tenant_name,
        // Context data (should be more reliable)
        contextUserExists: !!contextUser,
        contextUserId: contextUser?.id,
        contextTenantName: (contextUser as any)?.tenant_name,
      });
    }
  }, [open, user, contextUser]);

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-[900px] p-4">
        <DialogHeader className="pb-2">
          <DialogTitle>{t('wizard_create_button')}</DialogTitle>
        </DialogHeader>

        {open && !isLoading && (
          <DeploymentWizardMainClient
            onCancel={() => onOpenChange(false)}
            onDeploymentCreated={handleDeploymentCreated}
            repositories={repositories as Repository[]}
            hosts={hosts || []}
            teamId={activeTeam?.id || ''}
            userId={contextUser?.id || user?.id || ''}
            tenantName={(contextUser as any)?.tenant_name || (user as any)?.tenant_name || ''}
          />
        )}

        {open && isLoading && (
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin mb-4 border-t-2 border-b-2 border-primary rounded-full mx-auto"></div>
              <p className="text-muted-foreground">Loading wizard data...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
