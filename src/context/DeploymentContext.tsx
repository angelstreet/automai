'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import {
  useDeployments,
  useDeploymentById,
  useRepositoryScripts,
  useAvailableHosts,
  useRepositoriesForDeployment,
  createNewDeployment,
  removeDeployment,
  abortRunningDeployment,
  refreshDeploymentStatus,
  refreshDeploymentData,
} from '@/hooks/useDeploymentData';
import type { Deployment, DeploymentFormData } from '@/app/[locale]/[tenant]/deployment/types';

// Deployment context type definition
interface DeploymentContextType {
  deployments: Deployment[];
  repositories: any[];
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  isInitialized: boolean;
  // Methods
  fetchDeployments: (forceFresh?: boolean) => Promise<void>;
  fetchDeploymentById: (id: string) => Promise<Deployment | null>;
  createDeployment: (formData: DeploymentFormData) => Promise<{
    success: boolean;
    deploymentId?: string;
    error?: string;
  }>;
  abortDeployment: (id: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  refreshDeployment: (id: string) => Promise<{
    success: boolean;
    deployment?: Deployment;
    error?: string;
  }>;
  deleteDeployment: (id: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  fetchScriptsForRepository: (repositoryId: string) => Promise<any[]>;
  fetchAvailableHosts: () => Promise<any[]>;
  fetchRepositories: () => Promise<any[]>;
}

// Create context
const DeploymentContext = createContext<DeploymentContextType | undefined>(undefined);

// Provider component
export function DeploymentProvider({ children }: { children: ReactNode }) {
  // Use SWR hooks
  const {
    data: deploymentsData,
    error: deploymentsError,
    mutate: mutateDeployments,
    isValidating: isRefreshingDeployments,
  } = useDeployments();
  const { data: repositoriesData, error: repositoriesError } = useRepositoriesForDeployment();

  // Local state for tracking initialization
  const [isInitialized, setIsInitialized] = useState(false);

  // Derived values from SWR data
  const deployments = useMemo(() => deploymentsData || [], [deploymentsData]);
  const repositories = useMemo(() => repositoriesData?.data || [], [repositoriesData]);
  const loading = useMemo(
    () =>
      (deploymentsData === undefined && !deploymentsError) ||
      (repositoriesData === undefined && !repositoriesError),
    [deploymentsData, deploymentsError, repositoriesData, repositoriesError],
  );
  const error = useMemo(
    () =>
      deploymentsError
        ? String(deploymentsError)
        : repositoriesError
          ? String(repositoriesError)
          : null,
    [deploymentsError, repositoriesError],
  );

  // Methods
  const fetchDeployments = useCallback(
    async (forceFresh: boolean = false) => {
      if (forceFresh) {
        await refreshDeploymentData();
      }
      await mutateDeployments();
      setIsInitialized(true);
    },
    [mutateDeployments],
  );

  const fetchDeploymentById = useCallback(
    async (id: string) => {
      // First check if it's already in our deployments array
      const cachedDeployment = deployments.find((d) => d.id === id);
      if (cachedDeployment) {
        return cachedDeployment;
      }

      // If not, fetch it directly
      const { data } = await useDeploymentById(id);
      return data || null;
    },
    [deployments],
  );

  const createDeployment = useCallback(async (formData: DeploymentFormData) => {
    const result = await createNewDeployment(formData);
    return result;
  }, []);

  const abortDeployment = useCallback(async (id: string) => {
    const result = await abortRunningDeployment(id);
    return result;
  }, []);

  const refreshDeployment = useCallback(async (id: string) => {
    const result = await refreshDeploymentStatus(id);
    return result;
  }, []);

  const deleteDeployment = useCallback(async (id: string) => {
    const result = await removeDeployment(id);
    return result;
  }, []);

  const fetchScriptsForRepository = useCallback(async (repositoryId: string) => {
    const { data } = await useRepositoryScripts(repositoryId);
    return data || [];
  }, []);

  const fetchAvailableHosts = useCallback(async () => {
    const { data } = await useAvailableHosts();
    return data || [];
  }, []);

  const fetchRepositories = useCallback(async () => {
    return repositories;
  }, [repositories]);

  // Create context value with memoization
  const contextValue = useMemo(
    () => ({
      deployments,
      repositories,
      loading,
      error,
      isRefreshing: isRefreshingDeployments,
      isInitialized,
      fetchDeployments,
      fetchDeploymentById,
      createDeployment,
      abortDeployment,
      refreshDeployment,
      deleteDeployment,
      fetchScriptsForRepository,
      fetchAvailableHosts,
      fetchRepositories,
    }),
    [
      deployments,
      repositories,
      loading,
      error,
      isRefreshingDeployments,
      isInitialized,
      fetchDeployments,
      fetchDeploymentById,
      createDeployment,
      abortDeployment,
      refreshDeployment,
      deleteDeployment,
      fetchScriptsForRepository,
      fetchAvailableHosts,
      fetchRepositories,
    ],
  );

  return <DeploymentContext.Provider value={contextValue}>{children}</DeploymentContext.Provider>;
}

// Hook to use the context
export function useDeployment() {
  const context = useContext(DeploymentContext);

  if (context === undefined) {
    console.error('useDeployment must be used within a DeploymentProvider');
    // Return a safe fallback object with the same shape as the context
    return {
      deployments: [],
      repositories: [],
      loading: true,
      error: 'Context not available',
      isRefreshing: false,
      isInitialized: false,
      fetchDeployments: async () => {},
      fetchDeploymentById: async () => null,
      createDeployment: async () => ({ success: false, error: 'Context not available' }),
      abortDeployment: async () => ({ success: false, error: 'Context not available' }),
      refreshDeployment: async () => ({ success: false, error: 'Context not available' }),
      deleteDeployment: async () => ({ success: false, error: 'Context not available' }),
      fetchScriptsForRepository: async () => [],
      fetchAvailableHosts: async () => [],
      fetchRepositories: async () => [],
    };
  }

  return context;
}
