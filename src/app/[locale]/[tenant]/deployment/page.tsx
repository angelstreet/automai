'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { DeploymentWizard, DeploymentList } from './_components';
import { useDeployment, useRepository, AppProvider } from '@/context';

function DeploymentPageContent() {
  const [wizardActive, setWizardActive] = useState(false);
  const deploymentContext = useDeployment();
  const repositoryContext = useRepository();

  const { isInitialized, deployments, loading, isRefreshing } = deploymentContext || {};
  const deploymentRepos = deploymentContext?.repositories || [];
  const repositoryRepos = repositoryContext?.repositories || [];
  const repositories = deploymentRepos.length > 0 ? deploymentRepos : repositoryRepos;
  const isDataReady = repositories.length > 0 && isInitialized;
  const hasFetchedRef = useRef(false);

  // Debug logs
  console.log('[DeploymentPage] Debug status:', {
    repositoriesCount: repositories.length,
    deploymentLoading: loading,
    repositoryLoading: repositoryContext?.loading,
    deployments: deployments?.length || 0,
    isDataReady,
    wizardActive,
    hasFetched: hasFetchedRef.current,
    isInitialized,
  });

  const handleRefresh = () => {
    if (deploymentContext?.fetchDeployments) {
      console.log('[DeploymentPage] Manually refreshing deployments');
      deploymentContext.fetchDeployments();
    } else {
      console.warn('[DeploymentPage] fetchDeployments is not available in context');
    }
  };

  useEffect(() => {
    if (deploymentContext && deploymentContext.fetchDeployments) {
      console.log('[DeploymentPage] Component mounted, checking deployment data');
      if (!deployments || deployments.length === 0 && !loading && !isRefreshing) {
        console.log('[DeploymentPage] Fetching deployments on mount');
        hasFetchedRef.current = true;
        deploymentContext.fetchDeployments();
      }
    }
  }, [deploymentContext, deployments, loading, isRefreshing]);

  useEffect(() => {
    console.log('[DeploymentPage] Setting up event listeners');
    const handleToggleView = () => {
      console.log('[DeploymentPage] Toggle deployment view event received');
      setWizardActive(true);
    };
    const handleRefreshEvent = () => {
      if (!wizardActive) handleRefresh();
    };
    document.addEventListener('toggle-deployment-view', handleToggleView);
    document.addEventListener('refresh-deployments', handleRefreshEvent);

    if (window.location.hash === '#wizard' || new URLSearchParams(window.location.search).has('wizard')) {
      console.log('[DeploymentPage] Activating wizard from URL parameter');
      setWizardActive(true);
    }

    return () => {
      document.removeEventListener('toggle-deployment-view', handleToggleView);
      document.removeEventListener('refresh-deployments', handleRefreshEvent);
    };
  }, []);

  useEffect(() => {
    const handleRefreshEvent = () => {
      if (!wizardActive) handleRefresh();
    };
    document.addEventListener('refresh-deployments', handleRefreshEvent);
    return () => document.removeEventListener('refresh-deployments', handleRefreshEvent);
  }, [wizardActive]);

  const handleCancelWizard = () => {
    console.log('[DeploymentPage] Cancelling wizard');
    setWizardActive(false);
  };

  console.log('[DeploymentPage] Rendering with:', { wizardActive, isDataReady });

  if (!isInitialized) {
    return <div>Loading deployments...</div>;
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deployment</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage deployments and CI/CD integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
          <button
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setWizardActive(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Deployment
          </button>
        </div>
      </div>
      <div className="space-y-6">
        {wizardActive && isDataReady ? (
          <DeploymentWizard
            onCancel={handleCancelWizard}
            onDeploymentCreated={() => {
              console.log('[DeploymentPage] Deployment created successfully');
              handleRefresh();
              setWizardActive(false);
            }}
            explicitRepositories={repositories}
          />
        ) : (
          <DeploymentList
            onViewDeployment={(id) => console.log('[DeploymentPage] View deployment:', id)}
          />
        )}
      </div>
    </div>
  );
}

export default function DeploymentPage() {
  return (
    <AppProvider>
      <DeploymentPageContent />
    </AppProvider>
  );
}