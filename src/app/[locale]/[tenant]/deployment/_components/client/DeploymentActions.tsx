'use client';

import { PlusCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { getCICDProviders } from '@/app/actions/cicdAction';
import { getRepositories } from '@/app/actions/repositoriesAction';
import { useHost } from '@/context';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent } from '@/components/shadcn/dialog';

// Import required components
import { DeploymentWizardClient } from './DeploymentWizardClient';

export function DeploymentActions() {
  const t = useTranslations('deployments');
  const { hosts, isLoading: isLoadingHosts, refetchHosts } = useHost();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [repositories, setRepositories] = useState([]);
  const [cicdProviders, setCicdProviders] = useState([]);
  const [_isLoading, setIsLoading] = useState(false);

  // Fetch data for the wizard when opened
  useEffect(() => {
    const fetchData = async () => {
      if (showWizard && repositories.length === 0) {
        setIsLoading(true);
        try {
          // Fetch repositories
          const repoResult = await getRepositories();
          if (repoResult.success) {
            setRepositories(repoResult.data || []);
          }

          // Fetch CICD providers
          const providersResult = await getCICDProviders();
          if (providersResult.success) {
            setCicdProviders(providersResult.data || []);
          }
          
          // Hosts are fetched via the useHost hook automatically
        } catch (error) {
          console.error('Error fetching data for deployment wizard:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [showWizard, repositories.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh hosts using the useHost hook
      await refetchHosts();
      
      // Refresh other data
      const repoResult = await getRepositories();
      if (repoResult.success) {
        setRepositories(repoResult.data || []);
      }
      
      const providersResult = await getCICDProviders();
      if (providersResult.success) {
        setCicdProviders(providersResult.data || []);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
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
    // Add logic to refresh deployments if needed
  };

  return (
    <>
      <div className="flex items-center gap-2">
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
          {showWizard && (
            <DeploymentWizardClient
              onCancel={handleCloseWizard}
              onDeploymentCreated={handleDeploymentCreated}
              repositories={repositories}
              hosts={hosts}
              cicdProviders={cicdProviders}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
