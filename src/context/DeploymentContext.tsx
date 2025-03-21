'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Deployment, DeploymentFormData } from '@/app/[locale]/[tenant]/deployment/types';
import { 
  getDeployments, 
  getDeploymentById, 
  createDeployment as createDeploymentAction, 
  abortDeployment as abortDeploymentAction, 
  refreshDeployment as refreshDeploymentAction,
  updateDeployment,
  deleteDeployment
} from '@/app/[locale]/[tenant]/deployment/actions';
import { getRepositories } from '@/app/[locale]/[tenant]/repositories/actions';
import { getHosts as getAvailableHosts } from '@/app/[locale]/[tenant]/hosts/actions';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';
import { DeploymentContextType, DeploymentData, DeploymentActions, DEPLOYMENT_CACHE_KEYS } from '@/types/context/deployment';
import { useUser } from '@/hooks/useUser';

// Debounce function to prevent multiple rapid calls
const useDebounce = (fn: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      fn(...args);
      timeoutRef.current = null;
    }, delay);
  }, [fn, delay]);
};

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
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useUser();
  
  // Configure fetch cooldown in milliseconds
  const FETCH_COOLDOWN = 5000; // Only allow fetches every 5 seconds
  
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

  // Fetch all deployments with cooldown
  const fetchDeployments = useCallback(async (): Promise<void> => {
    // Check if we're already refreshing
    if (state.isRefreshing) return;
    
    // Check if we need to enforce cooldown
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    
    if (timeSinceLastFetch < FETCH_COOLDOWN) {
      console.log(`DeploymentContext: Throttling fetch, last fetch was ${timeSinceLastFetch}ms ago`);
      
      // Set a timer for the remaining cooldown time if one doesn't exist
      if (!fetchTimerRef.current) {
        const remainingTime = FETCH_COOLDOWN - timeSinceLastFetch;
        console.log(`DeploymentContext: Scheduling fetch in ${remainingTime}ms`);
        
        fetchTimerRef.current = setTimeout(() => {
          fetchTimerRef.current = null;
          fetchDeployments();
        }, remainingTime);
      }
      
      return;
    }
    
    setState(prev => ({ ...prev, loading: !prev.deployments.length, error: null, isRefreshing: true }));
    
    try {
      // Use cached user data when available
      const user = state.currentUser || await refreshUserData();
      
      // Update last fetch time
      lastFetchTimeRef.current = Date.now();
      
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

  // Debounced version of fetchDeployments to prevent multiple calls
  const debouncedFetchDeployments = useDebounce(fetchDeployments, 300);

  // Fetch deployment by ID, first check state cache
  const fetchDeploymentById = useCallback(async (id: string): Promise<Deployment | null> => {
    try {
      // First check if we already have the deployment in state
      const cachedDeployment = state.deployments.find(d => d.id === id);
      if (cachedDeployment) {
        console.log(`DeploymentContext: Found deployment ${id} in state cache`);
        return cachedDeployment;
      }
      
      // If not in state, use cached user data when available
      if (!state.currentUser) {
        await refreshUserData();
      }
      
      return await getDeploymentById(id);
    } catch (err) {
      console.error('Error fetching deployment by ID:', err);
      return null;
    }
  }, [state.deployments, state.currentUser, refreshUserData]);

  // Create new deployment
  const createDeployment = useCallback(async (formData: DeploymentFormData): Promise<{ 
    success: boolean; 
    deploymentId?: string; 
    error?: string 
  }> => {
    try {
      const result = await createDeploymentAction(formData);
      
      if (result && result.success && result.deploymentId) {
        // Refresh the deployments list, but debounced to prevent rapid calls
        debouncedFetchDeployments();
        return { success: true, deploymentId: result.deploymentId };
      }
      
      return { 
        success: false, 
        error: result && result.error ? result.error : 'Failed to create deployment' 
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create deployment' };
    }
  }, [debouncedFetchDeployments]);

  // Abort a running deployment
  const abortDeployment = useCallback(async (id: string): Promise<{ 
    success: boolean; 
    error?: string 
  }> => {
    try {
      const result = await abortDeploymentAction(id);
      
      if (result.success) {
        // Refresh the deployments list, but debounced to prevent rapid calls
        debouncedFetchDeployments();
        return { success: true };
      }
      
      return { success: false, error: result.error || 'Failed to abort deployment' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to abort deployment' };
    }
  }, [debouncedFetchDeployments]);

  // Refresh deployment status
  const refreshDeployment = useCallback(async (id: string): Promise<{ 
    success: boolean; 
    deployment?: Deployment; 
    error?: string 
  }> => {
    try {
      const result = await refreshDeploymentAction(id);
      
      if (result.success) {
        // Update the deployment in the local state without fetching all deployments
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
      // This function needs to be implemented or replaced with an appropriate API call
      // For now, return an empty array
      console.error('fetchScriptsForRepository needs to be implemented');
      return [];
    } catch (err) {
      console.error('Error fetching scripts:', err);
      return [];
    }
  }, []);

  // Fetch available hosts
  const fetchAvailableHosts = useCallback(async (): Promise<any[]> => {
    try {
      const response = await getAvailableHosts();
      return response.data || [];
    } catch (err) {
      console.error('Error fetching hosts:', err);
      return [];
    }
  }, []);
  
  // Fetch repositories
  const fetchRepositories = useCallback(async (): Promise<any[]> => {
    try {
      const response = await getRepositories();
      return response.data || [];
    } catch (err) {
      console.error('Error fetching repositories:', err);
      return [];
    }
  }, []);

  // Clean up timers on component unmount
  useEffect(() => {
    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
    };
  }, []);

  // Initialize by fetching user data and deployments
  useEffect(() => {
    const initialize = async () => {
      await refreshUserData();
      fetchDeployments();
    };
    
    initialize();
  }, [refreshUserData, fetchDeployments]);

  // Handle updating a deployment
  const handleUpdateDeployment = useCallback(async (id: string, data: Partial<DeploymentFormData>) => {
    try {
      console.log(`Context: Updating deployment with id ${id}`);
      const result = await updateDeployment(id, data);
      
      if (result) {
        setState(prev => ({
          ...prev,
          deployments: prev.deployments.map(d => (d.id === id ? result : d))
        }));
      }
      
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message || `Failed to update deployment with id ${id}` }));
      return null;
    }
  }, []);

  // Handle deleting a deployment
  const handleDeleteDeployment = useCallback(async (id: string) => {
    try {
      console.log(`Context: Deleting deployment with id ${id}`);
      const success = await deleteDeployment(id);
      
      if (success) {
        setState(prev => ({
          ...prev,
          deployments: prev.deployments.filter(d => d.id !== id)
        }));
      }
      
      return success;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message || `Failed to delete deployment with id ${id}` }));
      return false;
    }
  }, []);

  // Handle refreshing deployments
  const refreshDeployments = useCallback(async () => {
    if (state.isRefreshing) return;
    
    try {
      setState(prev => ({ ...prev, isRefreshing: true }));
      await fetchDeployments();
    } finally {
      setState(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [fetchDeployments, state.isRefreshing]);

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
    refreshUserData,
    updateDeployment: handleUpdateDeployment,
    deleteDeployment: handleDeleteDeployment,
    refreshDeployments
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