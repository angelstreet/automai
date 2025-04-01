'use client';

import { Rocket, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/shadcn/button';

export function ClientEmptyState() {
  const t = useTranslations('deployment');

  const handleNewDeployment = () => {
    // Find and click the deployment button directly
    const newDeploymentButton = document.getElementById('new-deployment-button');
    if (newDeploymentButton) {
      (newDeploymentButton as HTMLButtonElement).click();
    }
  };

  return (
    <div className="rounded-lg p-6">
      <EmptyState
        icon={<Rocket className="h-10 w-10" />}
        title={t('no_deployments_title', { fallback: 'No deployments found' })}
        description={t('no_deployments_description', {
          fallback: 'Create your first deployment to get started',
        })}
        action={
          <Button onClick={handleNewDeployment} size="sm" className="gap-1">
            <PlusCircle className="h-4 w-4" />
            <span>{t('new_deployment', { fallback: 'New Deployment' })}</span>
          </Button>
        }
      />
    </div>
  );
}
