'use client';

import { Rocket, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/shadcn/button';
import { EmptyState } from '@/components/layout/EmptyState';

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
    <div className="rounded-lg border">
      <EmptyState
        icon={<Rocket className="h-10 w-10" />}
        title={t('no_deployments_title', { fallback: 'No deployments found' })}
        description={t('no_deployments_description', { fallback: 'Create your first deployment to get started' })}
        action={
          <Button onClick={handleNewDeployment}>
            <Plus className="h-4 w-4 mr-2" />
            {t('new_deployment', { fallback: 'New Deployment' })}
          </Button>
        }
      />
    </div>
  );
}
