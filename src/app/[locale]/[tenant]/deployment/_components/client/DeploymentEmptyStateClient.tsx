'use client';

import { Rocket, PlusCircle, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Alert, AlertDescription, AlertTitle } from '@/components/shadcn/alert';
import { Button } from '@/components/shadcn/button';
import { EmptyState } from '@/components/ui/EmptyState';

interface DeploymentEmptyStateClientProps {
  errorMessage?: string;
}

export function DeploymentEmptyStateClient({ errorMessage }: DeploymentEmptyStateClientProps) {
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
      {errorMessage && (
        <div className="mb-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error loading deployments</AlertTitle>
            <AlertDescription>
              {errorMessage || 'Failed to load deployments. Please try again.'}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <EmptyState
        icon={<Rocket className="h-10 w-10" />}
        title={t('none_title')}
        description={
          errorMessage
            ? t('deployments_error_description', {
                fallback: 'There was an error loading deployments',
              })
            : t('none_desc', {
                fallback: 'Create your first deployment to get started',
              })
        }
        action={
          <Button onClick={handleNewDeployment} size="sm" className="gap-1">
            <PlusCircle className="h-4 w-4" />
            <span>{t('new_button')}</span>
          </Button>
        }
      />
    </div>
  );
}
