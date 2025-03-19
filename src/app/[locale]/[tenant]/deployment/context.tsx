'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Deployment, DeploymentFormData, DeploymentStatus } from './types';
import { 
  getDeployments, 
  getDeploymentById, 
  createDeployment as createDeploymentAction, 
  abortDeployment as abortDeploymentAction, 
  refreshDeployment as refreshDeploymentAction,
  getScriptsForRepository,
  getAvailableHosts,
  getDeploymentStatus,
  getRepositories
} from './actions';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';

/**
 * Cache keys for deployment data
 */
export const DEPLOYMENT_CACHE_KEYS = {
  DEPLOYMENTS: 'deployments',
  DEPLOYMENT_DETAILS: (id: string) => `deployment-${id}`,
  SCRIPTS: (repositoryId: string) => `scripts-${repositoryId}`,
  HOSTS: 'hosts',
  DEPLOYMENT_STATUS: (id: string) => `deployment-status-${id}`
};

/**
 * Deployment context type definition
 * Contains all state and functions related to deployments
 */
interface DeploymentContextType {
  // State
  deployments: Deployment[];
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  currentUser: AuthUser | null;
  
  // Core deployment actions
  fetchDeployments: () => Promise<void>;
  fetchDeploymentById: (id: string) => Promise<Deployment | null>;
  createDeployment: (formData: DeploymentFormData) => Promise<{ 
    success: boolean; 
    deploymentId?: string; 
    error?: string 
  }>;
  abortDeployment: (id: string) => Promise<{ 
    success: boolean; 
    error?: string 
  }>;
  refreshDeployment: (id: string) => Promise<{ 
    success: boolean; 
    deployment?: Deployment; 
    error?: string 
  }>;
  
  // Supporting data fetching
  fetchScriptsForRepository: (repositoryId: string) => Promise<any[]>;
  fetchAvailableHosts: () => Promise<any[]>;
  fetchRepositories: () => Promise<any[]>;
  fetchDeploymentStatus: (id: string) => Promise<{
    success: boolean;
    deployment?: any;
    cicd?: any;
    error?: string;
  }>;
  
  // User management
  refreshUserData: () => Promise<AuthUser | null>;
}

/**
 * Create the deployment context with undefined default value
 * This will be populated by the provider
 */
const DeploymentContext = createContext<DeploymentContextType | undefined>(undefined);

/**
 * Provider component that wraps the application and provides deployment context
 */
export const DeploymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State for deployments list
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  /**
   * Fetch the current user data and cache it in the context
   * This reduces redundant auth calls across deployment functions
   */
  const fetchUserData = useCallback(async () => {
    console.log('DeploymentContext: Fetching user data');
    try {
      const user = await getUser();
      setCurrentUser(user);
      return user;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }
  }, []);

  /**
   * Fetch all deployments
   * Updates the deployments state with the latest data
   */
  const fetchDeployments = useCallback(async () => {
    if (isRefreshing) return; // Prevent concurrent fetches
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      console.log('DeploymentContext: Fetching deployments');
      // Use cached user data when available
      const user = currentUser || await fetchUserData();
      
      const data = await getDeployments(user);
      setDeployments(data);
    } catch (err) {
      setError('Failed to load deployments');
      console.error('Error fetching deployments:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser, fetchUserData, isRefreshing]);

  /**
   * Fetch deployment by ID
   * @param id Deployment ID to fetch
   */
  const handleFetchDeploymentById = useCallback(async (id: string) => {
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      return await getDeploymentById(id);
    } catch (err) {
      console.error('Error fetching deployment by ID:', err);
      return null;
    }
  }, [currentUser, fetchUserData]);

  /**
   * Create a new deployment
   * @param formData Deployment form data
   */
  const handleCreateDeployment = useCallback(async (formData: DeploymentFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const result = await createDeploymentAction(formData);
      
      if (!result.success) {
        setError(result.error || 'Failed to create deployment');
        return { success: false, error: result.error };
      }
      
      // Refresh the deployments list after successful creation
      await fetchDeployments();
      
      return { success: true, deploymentId: result.deploymentId };
    } catch (err) {
      const errorMessage = 'Failed to create deployment';
      setError(errorMessage);
      console.error('Error creating deployment:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchUserData, fetchDeployments]);

  /**
   * Abort a deployment
   * @param id Deployment ID to abort
   */
  const handleAbortDeployment = useCallback(async (id: string) => {
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      return await abortDeploymentAction(id);
    } catch (err) {
      console.error('Error aborting deployment:', err);
      return { success: false, error: 'Failed to abort deployment' };
    }
  }, [currentUser, fetchUserData]);

  /**
   * Refresh a deployment's status
   * @param id Deployment ID to refresh
   */
  const handleRefreshDeployment = useCallback(async (id: string) => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const result = await refreshDeploymentAction(id);
      
      if (!result.success) {
        setError(result.error || 'Failed to refresh deployment');
        return { success: false, error: result.error };
      }
      
      // If we got updated deployment data, update it in the list
      if (result.deployment) {
        setDeployments(prevDeployments => 
          prevDeployments.map(d => 
            d.id === id ? result.deployment! : d
          )
        );
      }
      
      return { success: true, deployment: result.deployment };
    } catch (err) {
      const errorMessage = 'Failed to refresh deployment';
      setError(errorMessage);
      console.error('Error refreshing deployment:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser, fetchUserData]);

  /**
   * Fetch scripts for a repository
   * @param repositoryId Repository ID to fetch scripts for
   */
  const handleFetchScriptsForRepository = useCallback(async (repositoryId: string) => {
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      return await getScriptsForRepository(repositoryId);
    } catch (err) {
      console.error('Error fetching scripts:', err);
      return [];
    }
  }, [currentUser, fetchUserData]);

  /**
   * Get available hosts
   * Returns a list of hosts that can be used for deployments
   */
  const handleFetchAvailableHosts = useCallback(async () => {
    setLoading(true);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      return await getAvailableHosts(currentUser);
    } catch (err) {
      console.error('Error fetching hosts:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  /**
   * Fetch deployment status including CI/CD status
   * Takes deployment ID and returns comprehensive status information
   */
  const handleFetchDeploymentStatus = useCallback(async (id: string) => {
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      return await getDeploymentStatus(id, currentUser);
    } catch (err) {
      console.error('Error fetching deployment status:', err);
      return { success: false, error: 'Failed to fetch deployment status' };
    }
  }, [currentUser, fetchUserData]);

  /**
   * Fetch repositories
   * Returns a list of repositories
   */
  const handleFetchRepositories = useCallback(async () => {
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      return await getRepositories(currentUser);
    } catch (err) {
      console.error('Error fetching repositories:', err);
      return [];
    }
  }, [currentUser, fetchUserData]);

  // Initial data loading effect - only runs once on mount
  useEffect(() => {
    if (!initialized) {
      console.log('DeploymentContext: Initializing data');
      const initializeData = async () => {
        await fetchUserData();
        await fetchDeployments();
        setInitialized(true);
      };
      
      initializeData();
    }
  }, [initialized, fetchUserData, fetchDeployments]);

  // Create the context value object with all state and functions
  const contextValue: DeploymentContextType = {
    // State
    deployments,
    loading,
    error,
    isRefreshing,
    currentUser,
    
    // Core actions
    fetchDeployments,
    fetchDeploymentById: handleFetchDeploymentById,
    createDeployment: handleCreateDeployment,
    abortDeployment: handleAbortDeployment,
    refreshDeployment: handleRefreshDeployment,
    
    // Supporting data fetching
    fetchScriptsForRepository: handleFetchScriptsForRepository,
    fetchAvailableHosts: handleFetchAvailableHosts,
    fetchRepositories: handleFetchRepositories,
    fetchDeploymentStatus: handleFetchDeploymentStatus,
    
    // User management
    refreshUserData: fetchUserData
  };

  return (
    <DeploymentContext.Provider value={contextValue}>
      {children}
    </DeploymentContext.Provider>
  );
};

/**
 * Custom hook to use the deployment context
 * Throws an error if used outside of a DeploymentProvider
 */
export function useDeploymentContext(): DeploymentContextType {
  const context = useContext(DeploymentContext);
  
  if (context === undefined) {
    throw new Error('useDeploymentContext must be used within a DeploymentProvider');
  }
  
  return context;
}

/**
 * Hook to access deployments list and related functions
 * A convenience wrapper around useDeploymentContext
 */
export const useDeployments = () => {
  const context = useDeploymentContext();
  
  return {
    deployments: context.deployments,
    loading: context.loading,
    error: context.error,
    isRefreshing: context.isRefreshing,
    fetchDeployments: context.fetchDeployments,
    fetchRepositories: context.fetchRepositories
  };
};

/**
 * Hook to fetch and manage a specific deployment by ID
 * Handles loading, refreshing, and error states
 */
export function useDeploymentDetails(deploymentId: string) {
  const context = useDeploymentContext();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch deployment details
  const fetchDeployment = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await context.fetchDeploymentById(deploymentId);
      setDeployment(data);
    } catch (err) {
      setError('Failed to load deployment details');
      console.error('Error in useDeploymentDetails:', err);
    } finally {
      setLoading(false);
    }
  }, [context, deploymentId]);

  // Refresh deployment status
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      const result = await context.refreshDeployment(deploymentId);
      
      if (result.success && result.deployment) {
        setDeployment(result.deployment);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to refresh deployment');
      console.error('Error refreshing in useDeploymentDetails:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [context, deploymentId]);

  // Abort the deployment
  const handleAbort = useCallback(async () => {
    setError(null);
    
    try {
      const result = await context.abortDeployment(deploymentId);
      
      if (result.success) {
        // Refresh the deployment data after abort
        await fetchDeployment();
      } else if (result.error) {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      const errorMessage = 'Failed to abort deployment';
      setError(errorMessage);
      console.error('Error aborting in useDeploymentDetails:', err);
      return { success: false, error: errorMessage };
    }
  }, [context, deploymentId, fetchDeployment]);

  // Fetch deployment on mount and when ID changes
  useEffect(() => {
    fetchDeployment();
  }, [fetchDeployment]);

  return {
    deployment,
    loading,
    error,
    isRefreshing,
    refreshDeployment: handleRefresh,
    abortDeployment: handleAbort
  };
}

/**
 * Hook to monitor deployment status including CI/CD status
 * Provides real-time updates on deployment progress
 */
export function useDeploymentStatus(deploymentId?: string) {
  const context = useDeploymentContext();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(!!deploymentId);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Fetch status once
  const fetchStatus = useCallback(async () => {
    if (!deploymentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await context.fetchDeploymentStatus(deploymentId);
      
      if (result.success) {
        setStatus({
          deployment: result.deployment,
          cicd: result.cicd
        });
      } else {
        setError(result.error || 'Failed to fetch status');
      }
    } catch (err) {
      setError('Failed to fetch deployment status');
      console.error('Error in useDeploymentStatus:', err);
    } finally {
      setLoading(false);
    }
  }, [context, deploymentId]);

  // Start polling for status updates
  const startPolling = useCallback((intervalMs = 5000) => {
    if (!deploymentId) return;
    setIsPolling(true);
    
    const interval = setInterval(async () => {
      try {
        const result = await context.fetchDeploymentStatus(deploymentId);
        
        if (result.success) {
          setStatus({
            deployment: result.deployment,
            cicd: result.cicd
          });
          
          // Check if we should stop polling (deployment completed)
          const deploymentStatus = result.deployment?.status;
          if (
            deploymentStatus === 'success' || 
            deploymentStatus === 'failed' || 
            deploymentStatus === 'cancelled'
          ) {
            setIsPolling(false);
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Error polling deployment status:', err);
      }
    }, intervalMs);
    
    // Cleanup function
    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [context, deploymentId]);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  // Fetch status on mount and when ID changes
  useEffect(() => {
    if (deploymentId) {
      fetchStatus();
    }
  }, [fetchStatus, deploymentId]);

  return {
    status,
    loading,
    error,
    isPolling,
    fetchStatus,
    startPolling,
    stopPolling
  };
}
