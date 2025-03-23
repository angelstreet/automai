'use client';

import React, { useState, useEffect } from 'react';
import { DeploymentWizard, DeploymentList } from './_components';
import { useDeployment } from '@/context';

const DeploymentPage = () => {
  const [view, setView] = useState('list'); // 'list' or 'create'
  
  // Use the deployment context with null safety
  const deploymentContext = useDeployment();
  
  // Handle the case where context is still initializing (null)
  const {
    isRefreshing = false,
    fetchDeployments = async () => { console.log('Deployment context not initialized'); }
  } = deploymentContext || {};

  const handleRefresh = () => {
    fetchDeployments();
  };
  
  // Listen for custom events from layout
  useEffect(() => {
    const handleRefreshEvent = () => {
      if (view === 'list') {
        handleRefresh();
      }
    };
    
    const handleToggleView = () => {
      setView(view === 'list' ? 'create' : 'list');
    };
    
    // Add event listeners
    document.addEventListener('refresh-deployments', handleRefreshEvent);
    document.addEventListener('toggle-deployment-view', handleToggleView);
    
    // Clean up event listeners
    return () => {
      document.removeEventListener('refresh-deployments', handleRefreshEvent);
      document.removeEventListener('toggle-deployment-view', handleToggleView);
    };
  }, [view, handleRefresh]);

  return (
    <>
      {/* Remove the button container div as buttons are now in layout */}

      {view === 'list' ? (
        <DeploymentList onViewDeployment={(id) => console.log('View deployment:', id)} />
      ) : (
        <DeploymentWizard onComplete={() => setView('list')} />
      )}
    </>
  );
};

export default DeploymentPage;