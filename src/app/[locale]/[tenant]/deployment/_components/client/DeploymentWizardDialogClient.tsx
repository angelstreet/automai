'use client';

import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/shadcn/dialog';
import { useHost, useCICD } from '@/hooks';
import { useRepository } from '@/hooks/useRepository';
import { Deployment } from '@/types/component/deploymentComponentType';

import { DeploymentWizardMainClient } from './DeploymentWizardMainClient';

interface DeploymentWizardDialogClientProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (deployment: Deployment) => void;
}

export function DeploymentWizardDialogClient({
  open,
  onOpenChange,
  onSuccess,
}: DeploymentWizardDialogClientProps) {
  const t = useTranslations('team');
  const tc = useTranslations('deployment');
  const { hosts, isLoading: isLoadingHosts } = useHost();
  const { providers: cicdProviders, isLoading: isLoadingCICD } = useCICD();
  const { repositories, isLoading: isLoadingRepositories } = useRepository();

  const isLoading = isLoadingHosts || isLoadingCICD || isLoadingRepositories;

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
          <DialogTitle>{tc('wizard.createDeployment')}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-sm text-muted-foreground mb-4">
          {t('wizard_desc_placeholder', {
            defaultValue: 'Configure your new deployment settings',
          })}
        </DialogDescription>

        {open && !isLoading && (
          <DeploymentWizardMainClient
            onCancel={() => onOpenChange(false)}
            onDeploymentCreated={handleDeploymentCreated}
            repositories={repositories || []}
            hosts={hosts || []}
            cicdProviders={cicdProviders || []}
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
