'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { getDeployments } from '@/app/actions/deploymentsAction';

// Event constants
export const REFRESH_DEPLOYMENTS = 'refresh-deployments';
export const REFRESH_DEPLOYMENTS_COMPLETE = 'refresh-deployments-complete';

interface DeploymentProviderProps {
  children: ReactNode;
  initialDeployments: any[];
  initialRepositories: any[];
  initialLoading?: boolean;
}

interface DeploymentContextType {
  deployments: any[];
  repositories: any[];
  isLoading: boolean;
}

const DeploymentContext = createContext<DeploymentContextType | null>(null);

export function DeploymentProvider({
  children,
  initialDeployments,
  initialRepositories,
  initialLoading = false,
}: DeploymentProviderProps) {
  const [deployments, setDeployments] = useState(initialDeployments);
  const [repositories, setRepositories] = useState(initialRepositories);
  const [isLoading, setIsLoading] = useState(initialLoading);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = async () => {
      console.log('[DeploymentProvider] Refresh event received');

      setIsLoading(true);

      try {
        // Get fresh deployments data
        const deploymentsResponse = await getDeployments();
        const newDeployments = deploymentsResponse.success ? deploymentsResponse.data || [] : [];

        console.log(`[DeploymentProvider] Fetched ${newDeployments.length} deployments`);
        setDeployments(newDeployments);
      } catch (error) {
        console.error('[DeploymentProvider] Error fetching deployments:', error);
      } finally {
        setIsLoading(false);
        // Dispatch completion event
        window.dispatchEvent(new CustomEvent(REFRESH_DEPLOYMENTS_COMPLETE));
      }
    };

    window.addEventListener(REFRESH_DEPLOYMENTS, handleRefresh);
    return () => window.removeEventListener(REFRESH_DEPLOYMENTS, handleRefresh);
  }, []);

  // Context value
  const value = {
    deployments,
    repositories,
    isLoading,
  };

  // Dispatch event when deployment count changes
  useEffect(() => {
    console.log('[DeploymentProvider] Deployment count changed:', deployments.length);
    window.dispatchEvent(
      new CustomEvent('deployment-count-updated', {
        detail: { count: deployments.length },
      }),
    );
  }, [deployments.length]);

  return <DeploymentContext.Provider value={value}>{children}</DeploymentContext.Provider>;
}

export function useDeployment(componentName = 'unknown') {
  const context = useContext(DeploymentContext);

  if (!context) {
    console.error(`[useDeployment] Hook used outside of DeploymentProvider in ${componentName}`);
    throw new Error('useDeployment must be used within a DeploymentProvider');
  }

  return context;
}
