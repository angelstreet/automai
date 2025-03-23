'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DeploymentWizard, DeploymentList } from './_components';
import { useDeployment, useRepository } from '@/context';

const DeploymentPage = () => {
  // Replace view state with a dedicated wizardActive boolean state
  const [wizardActive, setWizardActive] = useState(false);
  
  // Use the deployment context with null safety
  const deploymentContext = useDeployment();
  // Also use repository context to ensure it's initialized
  const repositoryContext = useRepository();
  
  // Get repositories from both contexts - deployment context is the primary source
  // but fallback to repository context if needed
  const deploymentRepos = deploymentContext?.repositories || [];
  const repositoryRepos = repositoryContext?.repositories || [];
  
  // Use whichever source has more repositories
  const repositories = deploymentRepos.length >= repositoryRepos.length 
    ? deploymentRepos 
    : repositoryRepos;
  
  // Handle the case where context is still initializing (null)
  const {
    isRefreshing = false,
    fetchDeployments = async () => { console.log('Deployment context not initialized'); }
  } = deploymentContext || {};

  const handleRefresh = () => {
    fetchDeployments();
  };

  // Force wizard to open when directly accessing the wizard via URL
  useEffect(() => {
    // Check if we're trying to access the wizard directly via URL (check URL hash or search params)
    const isWizardPath = window.location.hash === '#wizard' || 
                         new URLSearchParams(window.location.search).has('wizard');
    
    if (isWizardPath && !wizardActive) {
      console.log('Setting wizard active due to URL parameter');
      setWizardActive(true);
    }
  }, [wizardActive]);
  
  // Listen for custom events from layout
  useEffect(() => {
    const handleRefreshEvent = () => {
      if (!wizardActive) {
        handleRefresh();
      }
    };
    
    // Modified to simply activate the wizard if not already active
    const handleToggleView = () => {
      console.log('Toggle deployment view event received, current wizardActive:', wizardActive);
      // Only activate if not already active
      if (!wizardActive) {
        console.log('Setting wizard active from event');
        setWizardActive(true);
      }
    };
    
    // Add event listeners
    document.addEventListener('refresh-deployments', handleRefreshEvent);
    document.addEventListener('toggle-deployment-view', handleToggleView);
    
    // Clean up event listeners
    return () => {
      document.removeEventListener('refresh-deployments', handleRefreshEvent);
      document.removeEventListener('toggle-deployment-view', handleToggleView);
    };
  }, [wizardActive, handleRefresh]);

  // Fetch repositories only once on mount using a ref
  const hasInitializedRef = useRef(false);
  
  useEffect(() => {
    // Only fetch repositories once on initial mount
    if (!hasInitializedRef.current) {
      console.log('Fetching repositories on initial page mount (once only)');
      hasInitializedRef.current = true;
      
      // Use only one method to fetch repositories
      if (deploymentContext?.fetchRepositories) {
        deploymentContext.fetchRepositories();
      } else if (repositoryContext?.fetchRepositories) {
        repositoryContext.fetchRepositories();
      }
    }
  }, [deploymentContext, repositoryContext]);

  // Log repositories when they change
  useEffect(() => {
    console.log(`Repositories available: ${repositories.length}`);
  }, [repositories]);

  const handleCancelWizard = () => {
    console.log('Cancelling wizard and returning to list view');
    setWizardActive(false);
  };

  return (
    <>
      {wizardActive ? (
        <DeploymentWizard 
          onCancel={handleCancelWizard}
          onDeploymentCreated={() => {
            console.log('Deployment created successfully, refreshing deployments');
            handleRefresh();
            // Optionally close the wizard after successful creation:
            // setWizardActive(false); 
          }}
          explicitRepositories={repositories}
        />
      ) : (
        <DeploymentList onViewDeployment={(id) => console.log('View deployment:', id)} />
      )}
    </>
  );
};

export default DeploymentPage;