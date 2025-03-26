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
  const { deployments, loading, isRefreshing, fetchDeployments } = useDeployment();
  const { repositories, refreshRepositories, loading: repoLoading } = useRepository();

  // Load initial deployments data
  useEffect(() => {
    if (fetchDeployments && (!deployments || deployments.length === 0)) {
      fetchDeployments();
    }
  }, []);

  // Simple function to handle new deployment
  const handleNewDeployment = async () => {
    // Only load repositories when opening the wizard
    if (refreshRepositories && (!repositories || repositories.length === 0)) {
      await refreshRepositories();
    }
    setWizardActive(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Deployments</h1>
        <div className="flex items-center space-x-2">
          <button
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleNewDeployment}
            disabled={loading || isRefreshing}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Deployment
          </button>
          <button
            className="inline-flex items-center px-2 py-1.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
            onClick={() => fetchDeployments?.(true)}
            disabled={loading || isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {wizardActive ? (
          <DeploymentWizard
            onCancel={() => setWizardActive(false)}
            onDeploymentCreated={() => {
              fetchDeployments?.();
              setWizardActive(false);
            }}
            explicitRepositories={repositories || []}
            isReady={!repoLoading}
          />
        ) : deployments && deployments.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-lg border border-dashed">
            <div className="mb-4 p-4 rounded-full bg-muted/30">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mb-2 text-lg font-medium">No deployments found</p>
            <p className="text-muted-foreground mb-4">Create your first deployment to get started</p>
            <button
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleNewDeployment}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Deployment
            </button>
          </div>
        ) : (
          <DeploymentList onViewDeployment={(id) => console.log('[DeploymentPage] View deployment:', id)} />
        )}
      </div>
    </div>
  );
}

// Export the wrapped component
export default function DeploymentPage() {
  return (
    <DeploymentPageProvider>
      <DeploymentPageContent />
    </DeploymentPageProvider>
  );
}
