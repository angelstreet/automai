'use client';

import { PlusCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

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

  // Listen for deployment count updates
  useEffect(() => {
    const handleDeploymentCountUpdate = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.count === 'number') {
        console.log('[DeploymentActions] Deployment count updated:', event.detail.count);
        setCurrentDeploymentCount(event.detail.count);
      }
    };

    window.addEventListener(
      'deployment-count-updated',
      handleDeploymentCountUpdate as EventListener,
    );
    return () => {
      window.removeEventListener(
        'deployment-count-updated',
        handleDeploymentCountUpdate as EventListener,
      );
    };
  }, []);

  // Listen for refresh complete event
  useEffect(() => {
    const handleRefreshComplete = () => {
      console.log('[DeploymentActions] Refresh complete');
      setIsRefreshing(false);
    };

    window.addEventListener('refresh-deployments-complete', handleRefreshComplete);
    return () => window.removeEventListener('refresh-deployments-complete', handleRefreshComplete);
  }, []);

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

    // Dispatch refresh event for deployment provider to handle
    window.dispatchEvent(new CustomEvent('refresh-deployments'));

    try {
      // Use hooks to refresh all related data in parallel
      await Promise.all([refetchHosts(), refetchRepositories()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
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
              tenantName: user?.tenant_name,
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
