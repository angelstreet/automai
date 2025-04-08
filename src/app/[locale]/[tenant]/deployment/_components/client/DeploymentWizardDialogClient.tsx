'use client';

import { useTranslations } from 'next-intl';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { useHost, useCICD } from '@/hooks';
import { useRepository } from '@/hooks/useRepository';
import { useTeam } from '@/hooks/useTeam';
import { useUser } from '@/hooks/useUser';
import { Deployment } from '@/types/component/deploymentComponentType';
import { Repository } from '@/types/component/repositoryComponentType';

import { DeploymentWizardMainClient } from './DeploymentWizardMainClient';

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
  const { hosts, isLoading: isLoadingHosts } = useHost();
  const { providers: cicdProviders, isLoading: isLoadingCICD } = useCICD();
  const { activeTeam } = useTeam();
  const { user } = useUser(null, 'DeploymentWizardDialogClient');

  // Only use the repository hook if no repositories were provided
  const { repositories: fetchedRepositories, isLoading: isLoadingRepositories } = useRepository({
    enabled: !initialRepositories || initialRepositories.length === 0,
  });

  // Use the provided repositories if available, otherwise use the fetched ones
  const repositories = initialRepositories || fetchedRepositories || [];

  const isLoading =
    isLoadingHosts || isLoadingCICD || (!initialRepositories && isLoadingRepositories);

  const handleDeploymentCreated = () => {
    // Close the dialog
    onOpenChange(false);

    // Refresh deployments
    window.dispatchEvent(new CustomEvent('refresh-deployments'));

    // Call success callback if provided
    if (onSuccess) {
      // Since we don't have the actual deployment data here,
      // we'll pass a placeholder. The recipient can refresh
      // to get the actual data.
      onSuccess({} as Deployment);
    }
  };

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
            repositories={repositories}
            hosts={hosts || []}
            cicdProviders={cicdProviders || []}
            teamId={activeTeam?.id || ''}
            userId={user?.id || ''}
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
