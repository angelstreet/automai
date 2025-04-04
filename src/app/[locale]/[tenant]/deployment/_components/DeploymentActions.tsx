'use client';

import { PlusCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/shadcn/dialog';
import { useHost, useCICD } from '@/hooks';
import { useRepository } from '@/hooks/useRepository';

// Import required components
import { DeploymentWizardClient } from './client/DeploymentWizardClient';

interface DeploymentActionsProps {
  deploymentCount?: number;
}

export function DeploymentActions({
  deploymentCount: initialDeploymentCount = 0,
}: DeploymentActionsProps) {
  const t = useTranslations('deployments');
  const { hosts, isLoading: isLoadingHosts, refetchHosts } = useHost();
  const { providers: cicdProviders, isLoading: isLoadingCICD, refetchProviders } = useCICD();
  const { repositories, isLoading: isLoadingRepositories, refetchRepositories } = useRepository();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [currentDeploymentCount, setCurrentDeploymentCount] = useState(initialDeploymentCount);

  const isLoading = isLoadingHosts || isLoadingCICD || isLoadingRepositories;

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

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    console.log('[DeploymentActions] Triggering refresh');

    // Dispatch refresh event for deployment provider to handle
    window.dispatchEvent(new CustomEvent('refresh-deployments'));

    try {
      // Use hooks to refresh all related data in parallel
      await Promise.all([refetchHosts(), refetchProviders(), refetchRepositories()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleAddDeployment = () => {
    // Open the deployment wizard dialog instead of dispatching an event
    setShowWizard(true);
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
  };

  const handleDeploymentCreated = () => {
    setShowWizard(false);
    // Refresh deployments after creation
    window.dispatchEvent(new CustomEvent('refresh-deployments'));
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
            {t('refresh')}
          </Button>
        )}
        <Button
          onClick={handleAddDeployment}
          id="add-deployment-button"
          size="sm"
          className="h-8 gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{t('create')}</span>
        </Button>
      </div>

      {/* Add the deployment wizard dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('createDeployment')}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t('createDeploymentDescription', {
                defaultValue: 'Configure your new deployment settings',
              })}
            </DialogDescription>
          </DialogHeader>
          {showWizard && (
            <DeploymentWizardClient
              onCancel={handleCloseWizard}
              onDeploymentCreated={handleDeploymentCreated}
              repositories={repositories || []}
              hosts={hosts || []}
              cicdProviders={cicdProviders || []}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
