'use client';

import { PlusCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { refreshDeployments } from '@/app/actions/jobsAction';
import { Button } from '@/components/shadcn/button';
import { useHost } from '@/hooks';
import { useRepository } from '@/hooks/useRepository';
import { useUser } from '@/hooks/useUser';
import { Repository } from '@/types/component/repositoryComponentType';

import { DeploymentEvents } from './DeploymentEventListener';
import { DeploymentWizardDialogClient } from './DeploymentWizardDialogClient';

interface DeploymentActionsClientProps {
  deploymentCount?: number;
  repositories?: Repository[];
}

export function DeploymentActionsClient({
  deploymentCount: initialDeploymentCount = 0,
  repositories,
}: DeploymentActionsClientProps) {
  const t = useTranslations('deployment');
  const c = useTranslations('common');
  const { refetchHosts } = useHost('DeploymentActionsClient');
  const { refetchRepositories } = useRepository('DeploymentActionsClient');
  const { user } = useUser(null, 'DeploymentActionsClient');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [currentDeploymentCount, setCurrentDeploymentCount] = useState(initialDeploymentCount);

  // Update deployment count when prop changes
  useEffect(() => {
    setCurrentDeploymentCount(initialDeploymentCount);
  }, [initialDeploymentCount]);

  // Listen for dialog open events
  useEffect(() => {
    const handleOpenDialog = () => {
      console.log('[@component:DeploymentActionsClient] Received open dialog event');
      setShowWizard(true);
    };

    window.addEventListener(DeploymentEvents.OPEN_DEPLOYMENT_DIALOG, handleOpenDialog);
    return () => {
      window.removeEventListener(DeploymentEvents.OPEN_DEPLOYMENT_DIALOG, handleOpenDialog);
    };
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    console.log('[DeploymentActions] Triggering refresh');

    try {
      // Call the server action to revalidate
      await refreshDeployments();

      // Use hooks to refresh all related data in parallel
      await Promise.all([refetchHosts(), refetchRepositories()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      // Mark refresh as complete after a delay to allow for animation
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {currentDeploymentCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {c('refresh')}
          </Button>
        )}
        <Button
          onClick={() => {
            // Log user data when button is clicked to verify it's loaded
            console.log('[DeploymentActions] Add button clicked - Current user data:', {
              userExists: !!user,
              userId: user?.id,
              userEmail: user?.email,
              // Type-safe access to tenant_name
              tenantName: (user as any)?.tenant_name,
              teamCount: user?.teams?.length,
            });
            setShowWizard(true);
          }}
          id="add-deployment-button"
          size="sm"
          className="h-8 gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{t('new_button')}</span>
        </Button>
      </div>

      <DeploymentWizardDialogClient
        open={showWizard}
        onOpenChange={setShowWizard}
        repositories={repositories}
      />
    </>
  );
}
