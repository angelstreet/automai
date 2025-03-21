'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Deployment, DeploymentFormData } from '@/app/[locale]/[tenant]/deployment/types';
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
} from '@/app/[locale]/[tenant]/deployment/actions';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';
import { DeploymentContextType, DeploymentData, DeploymentActions, DEPLOYMENT_CACHE_KEYS } from '@/types/context/deployment';

// Initial state
const initialState: DeploymentData = {
  deployments: [],
  loading: false,
  error: null,
  isRefreshing: false,
  currentUser: null
};

// Create the context
const DeploymentContext = createContext<DeploymentContextType | undefined>(undefined);

// Provider component
export const DeploymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DeploymentData>(initialState);
  
  // Fetch user data
  const refreshUserData = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const user = await getUser();
      setState(prev => ({ ...prev, currentUser: user }));
      return user;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }
  }, []);

  // Fetch all deployments
  const fetchDeployments = useCallback(async (): Promise<void> => {
    if (state.isRefreshing) return;
    
    setState(prev => ({ ...prev, loading: true, error: null, isRefreshing: true }));
    
    try {
      // Use cached user data when available
      const user = state.currentUser || await refreshUserData();
      
      const data = await getDeployments(user);
      setState(prev => ({ 
        ...prev, 
        deployments: data, 
        loading: false, 
        isRefreshing: false 
      }));
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to load deployments', 
        loading: false, 
        isRefreshing: false 
      }));
      console.error('Error fetching deployments:', err);
    }
  }, [state.currentUser, state.isRefreshing, refreshUserData]);

  // Fetch deployment by ID
  const fetchDeploymentById = useCallback(async (id: string): Promise<Deployment | null> => {
    try {
      // Use cached user data when available
      if (!state.currentUser) {
        await refreshUserData();
      }
      
      return await getDeploymentById(id);
    } catch (err) {
      console.error('Error fetching deployment by ID:', err);
      return null;
    }
  }, [state.currentUser, refreshUserData]);

  // Create new deployment
  const createDeployment = useCallback(async (formData: DeploymentFormData): Promise<{ 
    success: boolean; 
    deploymentId?: string; 
    error?: string 
  }> => {
    try {
      const result = await createDeploymentAction(formData);
      
      if (result.success && result.deploymentId) {
        // Refresh the deployments list
        fetchDeployments();
        return { success: true, deploymentId: result.deploymentId };
      }
      
      return { success: false, error: result.error || 'Failed to create deployment' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create deployment' };
    }
  }, [fetchDeployments]);

  // Abort a running deployment
  const abortDeployment = useCallback(async (id: string): Promise<{ 
    success: boolean; 
    error?: string 
  }> => {
    try {
      const result = await abortDeploymentAction(id);
      
      if (result.success) {
        // Refresh the deployments list
        fetchDeployments();
        return { success: true };
      }
      
      return { success: false, error: result.error || 'Failed to abort deployment' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to abort deployment' };
    }
  }, [fetchDeployments]);

  // Refresh deployment status
  const refreshDeployment = useCallback(async (id: string): Promise<{ 
    success: boolean; 
    deployment?: Deployment; 
    error?: string 
  }> => {
    try {
      const result = await refreshDeploymentAction(id);
      
      if (result.success) {
        // Update the deployment in the local state
        setState(prev => {
          const updatedDeployments = prev.deployments.map(d => 
            d.id === id && result.deployment ? result.deployment : d
          );
          
          return {
            ...prev,
            deployments: updatedDeployments
          };
        });
        
        return { success: true, deployment: result.deployment };
      }
      
      return { success: false, error: result.error || 'Failed to refresh deployment' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to refresh deployment' };
    }
  }, []);

  // Fetch scripts for a repository
  const fetchScriptsForRepository = useCallback(async (repositoryId: string): Promise<any[]> => {
    try {
      return await getScriptsForRepository(repositoryId);
    } catch (err) {
      console.error('Error fetching scripts:', err);
      return [];
    }
  }, []);

  // Fetch available hosts
  const fetchAvailableHosts = useCallback(async (): Promise<any[]> => {
    try {
      return await getAvailableHosts();
    } catch (err) {
      console.error('Error fetching hosts:', err);
      return [];
    }
  }, []);

  // Fetch repositories
  const fetchRepositories = useCallback(async (): Promise<any[]> => {
    try {
      return await getRepositories();
    } catch (err) {
      console.error('Error fetching repositories:', err);
      return [];
    }
  }, []);

  // Fetch deployment status
  const fetchDeploymentStatus = useCallback(async (id: string): Promise<{
    success: boolean;
    deployment?: any;
    cicd?: any;
    error?: string;
  }> => {
    try {
      // Use cached user data when available
      if (!state.currentUser) {
        await refreshUserData();
      }
      
      return await getDeploymentStatus(id, state.currentUser);
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to get deployment status' };
    }
  }, [state.currentUser, refreshUserData]);

  // Initialize by fetching user data and deployments
  useEffect(() => {
    const initialize = async () => {
      await refreshUserData();
      fetchDeployments();
    };
    
    initialize();
  }, [refreshUserData, fetchDeployments]);

  // Combine all methods and state into context value
  const contextValue: DeploymentContextType = {
    // State
    ...state,
    
    // Actions
    fetchDeployments,
    fetchDeploymentById,
    createDeployment,
    abortDeployment,
    refreshDeployment,
    fetchScriptsForRepository,
    fetchAvailableHosts,
    fetchRepositories,
    fetchDeploymentStatus,
    refreshUserData
  };
  
  return (
    <DeploymentContext.Provider value={contextValue}>
      {children}
    </DeploymentContext.Provider>
  );
};

// Hook to use the context
export function useDeploymentContext() {
  const context = useContext(DeploymentContext);
  if (context === undefined) {
    throw new Error('useDeploymentContext must be used within a DeploymentProvider');
  }
  return context;
} 