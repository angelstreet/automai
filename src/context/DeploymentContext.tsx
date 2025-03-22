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
import { useRequestProtection } from '@/hooks/useRequestProtection';
import { UserContext } from './UserContext';

// Reduce logging with a DEBUG flag
const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log(...args);

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
export const DeploymentProvider: React.FC<{ 
  children: ReactNode;
  userData?: AuthUser | null;
}> = ({ children, userData }) => {
  log('[DeploymentContext] DeploymentProvider initializing');
  
  // Get initial deployment data synchronously from localStorage
  const [state, setState] = useState<DeploymentData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem('cached_deployment');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData) as DeploymentData;
          log('[DeploymentContext] Using initial cached deployment data from localStorage');
          return parsedData;
        }
      } catch (e) {
        // Ignore localStorage errors
        log('[DeploymentContext] Error reading from localStorage:', e);
      }
    }
    return initialState;
  });

  // Add render count for debugging
  const renderCount = useRef<number>(0);
  
  // Add request protection
  const { protectedFetch, safeUpdateState, renderCount: protectedRenderCount } = useRequestProtection('DeploymentContext');
  
  // Add initialization tracker
  const initialized = useRef(false);
  
  // Configure fetch cooldown in milliseconds
  const FETCH_COOLDOWN = 5000; // Only allow fetches every 5 seconds
  
  // Fix the missing debouncedFetchRef and ensure proper typing
  const debouncedFetchRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  const userContext = useContext(UserContext);
  
  // For fetchDeployments, let's declare it first with proper type
  const fetchDeployments = useCallback(async (): Promise<Deployment[] | null> => {
    return await protectedFetch('fetchDeployments', async () => {
      try {
        if (debouncedFetchRef.current) {
          clearTimeout(debouncedFetchRef.current);
        }

        console.log('[DeploymentContext] Fetching deployments');
        safeUpdateState(
          setState,
          state,
          { ...state, loading: true, error: null },
          'start-loading'
        );

        // Adding slight delay for debouncing
        await new Promise(resolve => setTimeout(resolve, 100));

        // Mock API call for now
        // In a real app, this would be an API call to fetch deployments
        const deployments = [] as Deployment[]; // Mock data
        
        safeUpdateState(
          setState,
          { ...state, deployments: state.deployments, loading: state.loading },
          {
            ...state,
            deployments,
            loading: false,
            lastFetched: new Date()
          },
          'deployments-fetched'
        );

        console.log('[DeploymentContext] Deployments fetched:', deployments.length);
        return deployments;
      } catch (err: any) {
        console.error('[DeploymentContext] Error fetching deployments:', err);
        safeUpdateState(
          setState,
          state,
          { ...state, loading: false, error: err.message || 'Failed to fetch deployments' },
          'fetch-error'
        );
        return null;
      }
    });
  }, [state, safeUpdateState, protectedFetch]);
  
  // Now define refreshUserData which depends on fetchDeployments
  const refreshUserData = useCallback(async () => {
    if (!userData) return;
    
    await protectedFetch('refreshUserData', async () => {
      try {
        if (!userData || !userData.id) {
          console.log('[DeploymentContext] No user data available');
          return null;
        }
        
        const result = await fetchDeployments();
        return result;
      } catch (error) {
        console.error('[DeploymentContext] Error refreshing user data:', error);
        return null;
      }
    });
  }, [userData, fetchDeployments, protectedFetch]);

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    log('[DeploymentContext] Fetching user data...');
    
    if (!userContext) {
      log('[DeploymentContext] No user context available');
      return;
    }
    
    try {
      await protectedFetch('fetchUserData', async () => {
        // Just get user data from the context, don't do actual fetch
        if (userContext.user) {
          log('[DeploymentContext] User data available:', userContext.user);
        } else {
          log('[DeploymentContext] No user data in context');
        }
        return userContext.user;
      });
    } catch (error) {
      log('[DeploymentContext] Error fetching user data:', error);
    }
  }, [userContext, protectedFetch]);

  // Initialize deployment data
  useEffect(() => {
    log('[DeploymentContext] Initializing DeploymentContext...');
    
    const initialize = async () => {
      // Prevent double initialization
      if (initialized.current) {
        log('[DeploymentContext] Already initialized, skipping');
        return;
      }
      
      initialized.current = true;
      await fetchUserData();
      await fetchDeployments();
    };
    
    initialize();
    
    return () => {
      log('[DeploymentContext] DeploymentContext unmounting...');
      initialized.current = false;
    };
  }, [fetchUserData, fetchDeployments]);
  
  // Add one useful log when deployments are loaded
  useEffect(() => {
    if (state.deployments.length > 0 && !state.loading) {
      console.log('[DeploymentContext] Deployments loaded:', { 
        count: state.deployments.length
      });
    }
  }, [state.deployments.length, state.loading]);

  // Fetch deployment by ID with protection
  const fetchDeploymentById = useCallback(async (id: string): Promise<Deployment | null> => {
    return await protectedFetch(`fetchDeployment-${id}`, async () => {
      try {
        // First check if we already have the deployment in state
        const cachedDeployment = state.deployments.find(d => d.id === id);
        if (cachedDeployment) {
          console.log(`[DeploymentContext] Found deployment ${id} in state cache`);
          return cachedDeployment;
        }
        
        // If not in state, use cached user data when available
        const user = state.currentUser || await refreshUserData();
        
        console.log(`[DeploymentContext] Fetching deployment ${id} from server`);
        return await getDeploymentById(id);
      } catch (err) {
        console.error('Error fetching deployment by ID:', err);
        return null;
      }
    });
  }, [protectedFetch, refreshUserData, state]);

  // Fix the createDeployment function to handle properly typed responses
  const createDeployment = useCallback(async (formData: DeploymentFormData): Promise<{ 
    success: boolean; 
    deploymentId?: string; 
    error?: string 
  }> => {
    const result = await protectedFetch('createDeployment', async () => {
      try {
        console.log('[DeploymentContext] Creating new deployment');
        // Assume createDeploymentAction returns { success: boolean, deploymentId?: string, error?: string }
        const apiResult = await createDeploymentAction(formData);
        
        if (apiResult && apiResult.success && apiResult.deploymentId) {
          // Refresh the deployments list after creating
          fetchDeployments();
          return { success: true, deploymentId: apiResult.deploymentId };
        }
        
        return { 
          success: false, 
          error: apiResult && apiResult.error ? apiResult.error : 'Failed to create deployment' 
        };
      } catch (err: any) {
        console.error('[DeploymentContext] Error creating deployment:', err);
        return { success: false, error: err.message || 'Failed to create deployment' };
      }
    });
    
    // Handle null result case
    return result || { success: false, error: 'Operation failed' };
  }, [fetchDeployments, protectedFetch]);

  // Abort a deployment with protection
  const abortDeployment = useCallback(async (id: string): Promise<{ 
    success: boolean; 
    error?: string 
  }> => {
    const result = await protectedFetch(`abortDeployment-${id}`, async () => {
      try {
        console.log(`[DeploymentContext] Aborting deployment ${id}`);
        const result = await abortDeploymentAction(id);
        
        if (result && result.success) {
          // Refresh the deployments list after aborting
          fetchDeployments();
          return { success: true };
        }
        
        return { success: false, error: result?.error || 'Failed to abort deployment' };
      } catch (err: any) {
        console.error(`[DeploymentContext] Error aborting deployment ${id}:`, err);
        return { success: false, error: err.message || 'Failed to abort deployment' };
      }
    });
    
    // Handle null result case
    return result || { success: false, error: 'Operation failed' };
  }, [fetchDeployments, protectedFetch]);

  // Refresh a deployment with protection
  const refreshDeployment = useCallback(async (id: string): Promise<{ 
    success: boolean; 
    deployment?: Deployment; 
    error?: string 
  }> => {
    const result = await protectedFetch(`refreshDeployment-${id}`, async () => {
      try {
        console.log(`[DeploymentContext] Refreshing deployment ${id}`);
        const result = await refreshDeploymentAction(id);
        
        if (result && result.deployment) {
          // Update the deployment in the local state
          safeUpdateState(
            setState,
            { ...state, deployments: state.deployments },
            {
              ...state,
              deployments: state.deployments.map(d => 
                d.id === id && result.deployment ? result.deployment : d
              )
            },
            `deployment-${id}`
          );
          
          return { success: true, deployment: result.deployment };
        }
        
        return { success: false, error: result?.error || 'Failed to refresh deployment' };
      } catch (err: any) {
        console.error(`[DeploymentContext] Error refreshing deployment ${id}:`, err);
        return { success: false, error: err.message || 'Failed to refresh deployment' };
      }
    });
    
    // Handle null result case
    return result || { success: false, error: 'Operation failed' };
  }, [protectedFetch, safeUpdateState, state]);

  // Fetch scripts for a repository with protection
  const fetchScriptsForRepository = useCallback(async (repositoryId: string): Promise<any[]> => {
    const result = await protectedFetch(`fetchScripts-${repositoryId}`, async () => {
      try {
        console.log(`[DeploymentContext] Fetching scripts for repository ${repositoryId}`);
        // This needs to be implemented with an appropriate API call
        // For now, return empty array
        return [];
      } catch (err) {
        console.error(`[DeploymentContext] Error fetching scripts for repository ${repositoryId}:`, err);
        return [];
      }
    });
    
    // Handle null result case
    return result || [];
  }, [protectedFetch]);

  // Update the fetchAvailableHosts and fetchRepositories to handle null
  const fetchAvailableHosts = useCallback(async (): Promise<any[]> => {
    const result = await protectedFetch('fetchAvailableHosts', async () => {
      try {
        console.log('[DeploymentContext] Fetching available hosts');
        const response = await getAvailableHosts();
        return response?.data || [];
      } catch (err) {
        console.error('[DeploymentContext] Error fetching hosts:', err);
        return [];
      }
    });
    
    // Handle null result case
    return result || [];
  }, [protectedFetch]);

  // Fetch repositories with protection
  const fetchRepositories = useCallback(async (): Promise<any[]> => {
    const result = await protectedFetch('fetchRepositories', async () => {
      try {
        console.log('[DeploymentContext] Fetching repositories');
        const response = await getRepositories();
        return response?.data || [];
      } catch (err) {
        console.error('[DeploymentContext] Error fetching repositories:', err);
        return [];
      }
    });
    
    // Handle null result case
    return result || [];
  }, [protectedFetch]);

  // Update fetchDeploymentStatus to always return a valid object
  const fetchDeploymentStatus = useCallback(async (id: string): Promise<any> => {
    const result = await protectedFetch(`fetchDeploymentStatus-${id}`, async () => {
      try {
        console.log(`[DeploymentContext] Fetching status for deployment ${id}`);
        // This would normally call an API endpoint to get the status
        // For now, we'll just return a mock status
        return { status: 'running', progress: 50 };
      } catch (err) {
        console.error(`[DeploymentContext] Error fetching status for deployment ${id}:`, err);
        return null;
      }
    });
    
    // Handle null result case
    return result || { status: 'unknown', progress: 0 };
  }, [protectedFetch]);

  // Create the context value
  const contextValue = {
    ...state,
    refreshUserData,
    fetchDeployments,
    fetchDeploymentById,
    createDeployment,
    abortDeployment,
    refreshDeployment,
    updateDeployment,
    deleteDeployment,
    fetchScriptsForRepository,
    fetchAvailableHosts,
    fetchRepositories,
    fetchDeploymentStatus
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