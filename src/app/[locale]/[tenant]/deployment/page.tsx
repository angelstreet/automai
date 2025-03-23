'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DeploymentWizard, DeploymentList } from './_components';
import { useDeployment, useRepository } from '@/context';

const DeploymentPage = () => {
  // Simple state for wizard visibility
  const [wizardActive, setWizardActive] = useState(false);
  
  // Get contexts
  const deploymentContext = useDeployment();
  const repositoryContext = useRepository();
  
  // Get combined repositories
  const deploymentRepos = deploymentContext?.repositories || [];
  const repositoryRepos = repositoryContext?.repositories || [];
  
  // Use whichever source has repositories
  const repositories = deploymentRepos.length > 0 ? deploymentRepos : repositoryRepos;
  
  // Are repositories loaded?
  const isDataReady = 
    repositories.length > 0 && 
    !deploymentContext?.loading && 
    !repositoryContext?.loading;
  
  // Handle refreshing deployments
  const handleRefresh = () => {
    if (deploymentContext?.fetchDeployments) {
      deploymentContext.fetchDeployments();
    }
  };

  // Setup event listeners once on mount
  useEffect(() => {
    console.log('[DeploymentPage] Setting up event listeners');
    
    const handleToggleView = () => {
      console.log('[DeploymentPage] Toggle deployment view event received');
      setWizardActive(true);
    };
    
    const handleRefreshEvent = () => {
      if (!wizardActive) {
        handleRefresh();
      }
    };
    
    // Add event listeners
    document.addEventListener('toggle-deployment-view', handleToggleView);
    document.addEventListener('refresh-deployments', handleRefreshEvent);
    
    // Handle direct URL access
    if (window.location.hash === '#wizard' || 
        new URLSearchParams(window.location.search).has('wizard')) {
      console.log('[DeploymentPage] Activating wizard from URL parameter');
      setWizardActive(true);
    }
    
    return () => {
      document.removeEventListener('toggle-deployment-view', handleToggleView);
      document.removeEventListener('refresh-deployments', handleRefreshEvent);
    };
  }, []);
  
  // Update refresh event dependency on wizardActive state
  useEffect(() => {
    const handleRefreshEvent = () => {
      if (!wizardActive) {
        handleRefresh();
      }
    };
    
    document.addEventListener('refresh-deployments', handleRefreshEvent);
    return () => {
      document.removeEventListener('refresh-deployments', handleRefreshEvent);
    };
  }, [wizardActive]);
  
  // Handle cancel from wizard
  const handleCancelWizard = () => {
    console.log('[DeploymentPage] Cancelling wizard');
    setWizardActive(false);
  };

  return (
    <>
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
        <DeploymentList onViewDeployment={(id) => console.log('[DeploymentPage] View deployment:', id)} />
      )}
    </>
  );
};

export default DeploymentPage;