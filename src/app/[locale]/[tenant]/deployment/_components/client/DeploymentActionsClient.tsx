'use client';

import { PlusCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { useHost, useCICD } from '@/hooks';
import { useRepository } from '@/hooks/useRepository';

import { DeploymentWizardDialogClient } from './DeploymentWizardDialogClient';

interface DeploymentActionsClientProps {
  deploymentCount?: number;
}

export function DeploymentActionsClient({
  deploymentCount: initialDeploymentCount = 0,
}: DeploymentActionsClientProps) {
  const t = useTranslations('deployments');
  const { refetchHosts } = useHost();
  const { refetchProviders } = useCICD();
  const { refetchRepositories } = useRepository();
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
          onClick={() => setShowWizard(true)}
          id="add-deployment-button"
          size="sm"
          className="h-8 gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{t('create')}</span>
        </Button>
      </div>

      <DeploymentWizardDialogClient
        open={showWizard}
        onOpenChange={setShowWizard}
      />
    </>
  );
}