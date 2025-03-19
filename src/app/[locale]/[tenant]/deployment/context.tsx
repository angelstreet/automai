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
  getDeploymentStatus
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
  
  // Supporting actions
  fetchScriptsForRepository: (repositoryId: string) => Promise<any[]>;
  fetchAvailableHosts: () => Promise<any[]>;
  fetchDeploymentStatus: (id: string) => Promise<{
    success: boolean;
    deployment?: any;
    cicd?: any;
    error?: string;
  }>;
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
   * Fetch a single deployment by ID
   * Returns the deployment data or null if not found
   */
  const fetchDeploymentById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const deployment = await getDeploymentById(id, currentUser);
      return deployment;
    } catch (err) {
      setError('Failed to load deployment details');
      console.error('Error fetching deployment by ID:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  /**
   * Create a new deployment
   * Takes form data and returns success status with optional deployment ID
   */
  const handleCreateDeployment = useCallback(async (formData: DeploymentFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const result = await createDeploymentAction(formData, currentUser);
      
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
   * Abort a running deployment
   * Takes deployment ID and returns success status
   */
  const handleAbortDeployment = useCallback(async (id: string) => {
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const result = await abortDeploymentAction(id, currentUser);
      
      if (!result.success) {
        setError(result.error || 'Failed to abort deployment');
        return { success: false, error: result.error };
      }
      
      // Refresh the deployments list after successful abort
      await fetchDeployments();
      
      return { success: true };
    } catch (err) {
      const errorMessage = 'Failed to abort deployment';
      setError(errorMessage);
      console.error('Error aborting deployment:', err);
      return { success: false, error: errorMessage };
    }
  }, [currentUser, fetchUserData, fetchDeployments]);

  /**
   * Refresh a deployment's status
   * Takes deployment ID and returns updated deployment data
   */
  const handleRefreshDeployment = useCallback(async (id: string) => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      const result = await refreshDeploymentAction(id, currentUser);
      
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
   * Get scripts for a repository
   * Takes repository ID and returns available scripts
   */
  const handleFetchScriptsForRepository = useCallback(async (repositoryId: string) => {
    setLoading(true);
    
    try {
      // Use cached user data when available
      if (!currentUser) {
        await fetchUserData();
      }
      
      return await getScriptsForRepository(repositoryId, currentUser);
    } catch (err) {
      console.error('Error fetching scripts:', err);
      return [];
    } finally {
      setLoading(false);
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
    fetchDeploymentById,
    createDeployment: handleCreateDeployment,
    abortDeployment: handleAbortDeployment,
    refreshDeployment: handleRefreshDeployment,
    
    // Supporting actions
    fetchScriptsForRepository: handleFetchScriptsForRepository,
    fetchAvailableHosts: handleFetchAvailableHosts,
    fetchDeploymentStatus: handleFetchDeploymentStatus,
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
export function useDeployments() {
  const { 
    deployments, 
    loading, 
    error, 
    isRefreshing, 
    fetchDeployments 
  } = useDeploymentContext();
  
  return {
    deployments,
    loading,
    error,
    isRefreshing,
    fetchDeployments
  };
}

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
