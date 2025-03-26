'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { DeploymentWizard, DeploymentList } from './_components';
import { useDeployment, useRepository, createContextProvider } from '@/context';

// Create a specialized provider that includes all required contexts
const DeploymentPageProvider = createContextProvider({
  deployment: true,
  repository: true,
  host: true,
  cicd: true,
});

function DeploymentPageContent() {
  const [wizardActive, setWizardActive] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const deploymentContext = useDeployment();
  const repositoryContext = useRepository();

  // Use SWR through the context
  const { isInitialized, deployments, loading, isRefreshing, fetchDeployments } = deploymentContext || {};
  const deploymentRepos = deploymentContext?.repositories || [];
  const repositoryRepos = repositoryContext?.repositories || [];
  const repositories = deploymentRepos.length > 0 ? deploymentRepos : repositoryRepos;
  const isDataReady = repositories.length > 0 && isInitialized;

  // Trigger initial data fetch once when component mounts (if needed)
  useEffect(() => {
    // Only trigger a fetch if we have no data and a function to fetch
    if (fetchDeployments && (!deployments || deployments.length === 0)) {
      console.log('[DeploymentPage] No deployments found, fetching data');
      fetchDeployments(false).catch(error => {
        console.error('[DeploymentPage] Error fetching deployments:', error);
      });
    }
  }, []); // Empty dependency array - only runs once on mount

  // Debug logs
  console.log('[DeploymentPage] Debug status:', {
    repositoriesCount: repositories.length,
    deploymentLoading: loading,
    repositoryLoading: repositoryContext?.loading,
    deployments: deployments?.length || 0,
    isDataReady,
    wizardActive,
    isInitialized,
  });

  const handleRefresh = () => {
    if (fetchDeployments) {
      console.log('[DeploymentPage] Manually refreshing deployments');
      fetchDeployments(true); // Force fresh data
    } else {
      console.warn('[DeploymentPage] fetchDeployments is not available in context');
    }
  };

  // Set initial loading state based on data presence
  useEffect(() => {
    // If we have deployments data immediately, don't show loading
    if (deployments && deployments.length > 0) {
      setIsInitialLoading(false);
    }

    // Set a timeout to stop loading after max 1 second
    const timeoutId = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Run only once on mount

  // Update loading state when data changes
  useEffect(() => {
    if (deployments?.length > 0) {
      console.log('[DeploymentPage] Deployments data updated', {
        deploymentCount: deployments?.length || 0,
        loading,
      });
      // When deployments data arrives, immediately stop loading
      setIsInitialLoading(false);
    }
  }, [deployments?.length, loading]);

  useEffect(() => {
    console.log('[DeploymentPage] Setting up event listeners');
    const handleToggleView = () => {
      console.log('[DeploymentPage] Toggle deployment view event received');
      setWizardActive(true);
    };
    const handleRefreshEvent = () => {
      if (!wizardActive && fetchDeployments) fetchDeployments();
    };
    document.addEventListener('toggle-deployment-view', handleToggleView);
    document.addEventListener('refresh-deployments', handleRefreshEvent);

    if (
      window.location.hash === '#wizard' ||
      new URLSearchParams(window.location.search).has('wizard')
    ) {
      console.log('[DeploymentPage] Activating wizard from URL parameter');
      setWizardActive(true);
    }

    return () => {
      document.removeEventListener('toggle-deployment-view', handleToggleView);
      document.removeEventListener('refresh-deployments', handleRefreshEvent);
    };
  }, [fetchDeployments, wizardActive]);

  useEffect(() => {
    const handleRefreshEvent = () => {
      if (!wizardActive && fetchDeployments) fetchDeployments();
    };
    document.addEventListener('refresh-deployments', handleRefreshEvent);
    return () => document.removeEventListener('refresh-deployments', handleRefreshEvent);
  }, [wizardActive, fetchDeployments]);

  const handleCancelWizard = () => {
    console.log('[DeploymentPage] Cancelling wizard');
    setWizardActive(false);
  };

  console.log('[DeploymentPage] Rendering with:', { wizardActive, isDataReady });

  // Show loading animation when not initialized or during initial loading
  if ((!isInitialized || isInitialLoading) && (!deployments || deployments.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-12 w-12 animate-spin mb-4 border-t-2 border-b-2 border-primary rounded-full"></div>
        <p className="text-lg font-medium text-muted-foreground">Loading deployments...</p>
      </div>
    );
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
              if (fetchDeployments) fetchDeployments();
              setWizardActive(false);
            }}
            explicitRepositories={repositories}
          />
        ) : deployments && deployments.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-lg border border-dashed">
            <div className="mb-4 p-4 rounded-full bg-muted/30">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mb-2 text-lg font-medium">No deployments found</p>
            <p className="text-muted-foreground mb-4">
              Create your first deployment to get started
            </p>
            <button
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setWizardActive(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Deployment
            </button>
          </div>
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
    <DeploymentPageProvider>
      <DeploymentPageContent />
    </DeploymentPageProvider>
  );
}
