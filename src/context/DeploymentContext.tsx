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
  deleteDeployment,
  getScriptsForRepository
} from '@/app/[locale]/[tenant]/deployment/actions';
import { getRepositories } from '@/app/[locale]/[tenant]/repositories/actions';
import { getHosts as getAvailableHosts } from '@/app/[locale]/[tenant]/hosts/actions';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';
import { DeploymentContextType, DeploymentData, DeploymentActions, DEPLOYMENT_CACHE_KEYS } from '@/types/context/deployment';
import { useRequestProtection } from '@/hooks/useRequestProtection';
import { persistedData } from './AppContext';

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
  repositories: [],
  loading: true,
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
  
  // First, in the useState initializers, check for persisted data:
  const [deployments, setDeployments] = useState<Deployment[]>(
    persistedData?.deploymentData?.deployments || []
  );

  const [repositories, setRepositories] = useState<Repository[]>(
    persistedData?.deploymentData?.repositories || []
  );

  const [loading, setLoading] = useState<boolean>(
    persistedData?.deploymentData?.loading !== undefined 
      ? persistedData.deploymentData.loading 
      : true
  );

  // Get initial deployment data synchronously from localStorage
  const [state, setState] = useState<DeploymentData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem('cached_deployment');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData) as DeploymentData;
          console.log('[DeploymentContext] Using initial cached deployment data from localStorage:', 
            parsedData.deployments?.length || 0, 'deployments,', 
            parsedData.repositories?.length || 0, 'repositories');
          return {
            ...parsedData,
            loading: false // Set loading to false for cached data
          };
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
  
  // Fix the missing debouncedFetchRef and ensure proper typing
  const debouncedFetchRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  
  // Use a simple Boolean state for initialization instead of a ref
  const [initialized, setInitialized] = useState(false);

  // Add deployment caching to localStorage
  useEffect(() => {
    if (state.deployments.length > 0) {
      try {
        localStorage.setItem('cached_deployment', JSON.stringify(state));
        localStorage.setItem('cached_deployment_time', Date.now().toString());
        log('[DeploymentContext] Saved deployment data to localStorage cache');
      } catch (e) {
        log('[DeploymentContext] Error saving to localStorage:', e);
      }
    }
  }, [state.deployments.length]);

  // Fetch user data - use userData prop directly
  const fetchUserData = useCallback(async () => {
    log('[DeploymentContext] Fetching user data...');
    
    if (!userData) {
      log('[DeploymentContext] No user data available in props');
      return;
    }
    
    try {
      await protectedFetch('fetchUserData', async () => {
        // Use userData prop directly
        log('[DeploymentContext] User data available from props:', userData);
        return userData;
      });
    } catch (error) {
      log('[DeploymentContext] Error fetching user data:', error);
    }
  }, [userData, protectedFetch]);

  // Fetch repositories with protection
  const fetchRepositories = useCallback(async (): Promise<any[]> => {
    console.log('[DeploymentContext] Fetching repositories');
    
    try {
      const result = await protectedFetch('fetchRepositories', async () => {
        try {
          const response = await getRepositories();
          const data = response?.data || [];
          console.log(`[DeploymentContext] Repository data fetched:`, data.length);
          return data;
        } catch (err) {
          console.error('[DeploymentContext] Error fetching repositories:', err);
          return [];
        }
      });
      
      // Store repositories in state for future use
      if (result && Array.isArray(result)) {
        console.log(`[DeploymentContext] Updating state with ${result.length} repositories`);
        safeUpdateState(
          setState,
          state,
          { ...state, repositories: result },
          'repositories-updated'
        );
        
        // Also store in localStorage immediately for faster loading next time
        try {
          const updatedState = { ...state, repositories: result };
          localStorage.setItem('cached_deployment', JSON.stringify(updatedState));
          localStorage.setItem('cached_deployment_time', Date.now().toString());
        } catch (e) {
          console.error('[DeploymentContext] Error saving repositories to cache:', e);
        }
      } else {
        console.log('[DeploymentContext] No repositories returned from API');
      }
      
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('[DeploymentContext] Error fetching repositories:', error);
      return [];
    }
  }, [protectedFetch, state, safeUpdateState]);

  // For fetchDeployments, let's declare it first with proper type
  const fetchDeployments = useCallback(async (forceFresh: boolean = false): Promise<Deployment[] | null> => {
    // Remove all throttling comments
    lastFetchTimeRef.current = Date.now();

    return await protectedFetch('fetchDeployments', async () => {
      try {
        if (debouncedFetchRef.current) {
          clearTimeout(debouncedFetchRef.current);
        }

        console.log('[DeploymentContext] Fetching deployments' + (forceFresh ? ' (force fresh)' : ''));
        
        // Check if we're refreshing cached data or doing an initial load
        const isRefreshingCachedData = state.deployments.length > 0;
        
        // Set appropriate flags based on whether we're refreshing or loading
        if (isRefreshingCachedData) {
          // If refreshing, just set isRefreshing=true without loading=true
          setState(prevState => ({ ...prevState, isRefreshing: true, error: null }));
          console.log('[DeploymentContext] Refreshing deployments, isRefreshing=TRUE');
        } else {
          // If initial load, set loading=true
          setState(prevState => ({ ...prevState, loading: true, error: null }));
          console.log('[DeploymentContext] Initial load, loading=TRUE');
        }

        // Clear local storage cache if forceFresh is true
        if (forceFresh && typeof window !== 'undefined') {
          console.log('[DeploymentContext] Forcing fresh data, clearing localStorage cache');
          try {
            localStorage.removeItem('cached_deployment');
            localStorage.removeItem('cached_deployment_time');
          } catch (e) {
            console.error('[DeploymentContext] Error clearing localStorage:', e);
          }
        }

        // Use the real API call instead of mock data
        const deployments = await getDeployments();
        
        // Always set loading explicitly using regular setState to ensure UI updates
        setState(prevState => ({ 
          ...prevState, 
          deployments,
          loading: false,
          isRefreshing: false
        }));
        console.log('[DeploymentContext] Set loading=FALSE, isRefreshing=FALSE');
        console.log('[DeploymentContext] Deployments fetched:', deployments.length);

        // Update localStorage cache
        try {
          const updatedState = { ...state, deployments, loading: false, isRefreshing: false };
          localStorage.setItem('cached_deployment', JSON.stringify(updatedState));
          localStorage.setItem('cached_deployment_time', Date.now().toString());
          console.log('[DeploymentContext] Updated localStorage cache with new deployments');
        } catch (e) {
          console.error('[DeploymentContext] Error saving to localStorage:', e);
        }

        return deployments;
      } catch (err: any) {
        console.error('[DeploymentContext] Error fetching deployments:', err);
        
        // Always set loading explicitly using regular setState to ensure UI updates
        setState(prevState => ({ 
          ...prevState, 
          loading: false,
          isRefreshing: false,
          error: err.message || 'Failed to fetch deployments' 
        }));
        
        return null;
      }
    });
  }, [state, protectedFetch]);
  
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

  // Replace the initialization effect with the exact same pattern from the working implementation
  useEffect(() => {
    if (!initialized) {
      console.log('[DeploymentContext] Initializing data');
      const initializeData = async () => {
        try {
          // Only set loading to true if we don't have cached data
          if (state.deployments.length === 0) {
            // Use regular setState to bypass safeUpdateState's change detection
            setState(prevState => ({ ...prevState, loading: true }));
            console.log('[DeploymentContext] No cached data, set loading state to TRUE directly');
          } else {
            console.log('[DeploymentContext] Using cached data, keeping loading FALSE while refreshing');
          }
          
          // If we don't have cached repositories but have cached deployments, fetch repositories first
          if (state.deployments.length > 0 && state.repositories.length === 0) {
            console.log('[DeploymentContext] Have cached deployments but no repos, fetching repos first');
            await fetchRepositories();
          }
          
          await fetchUserData();
          
          // Use a flag to track whether we're refreshing vs initial loading
          const isRefreshingCachedData = state.deployments.length > 0;
          if (isRefreshingCachedData) {
            // For refreshing cached data, set isRefreshing but keep loading=false
            setState(prevState => ({ ...prevState, isRefreshing: true }));
          }
          
          // Always refresh the data
          await fetchDeployments();
          
          // Only fetch repositories if not already loaded
          if (state.repositories.length === 0) {
            await fetchRepositories();
          }
          
          // Only set initialized here, not in fetchDeployments
          setInitialized(true);
          
          // Use regular setState to bypass safeUpdateState's change detection
          setState(prevState => ({ 
            ...prevState, 
            loading: false,
            isRefreshing: false 
          }));
          console.log('[DeploymentContext] Set loading state to FALSE directly');
          
          console.log('[DeploymentContext] Initialization complete');
        } catch (error) {
          console.error('[DeploymentContext] Error during initialization:', error);
          
          // Use regular setState to bypass safeUpdateState's change detection
          setState(prevState => ({ 
            ...prevState, 
            loading: false, 
            isRefreshing: false,
            error: String(error) 
          }));
        }
      };
      
      initializeData();
    }
  }, [initialized, fetchUserData, fetchDeployments, fetchRepositories, state]);
  
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
        // Cast the result to the expected response type
        const apiResult = await createDeploymentAction(formData) as unknown as { 
          success: boolean; 
          data?: { id: string }; 
          error?: string 
        };
        
        if (apiResult && apiResult.success && apiResult.data?.id) {
          // Refresh the deployments list after creating
          fetchDeployments();
          return { success: true, deploymentId: apiResult.data.id };
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
        // Use the API function instead of returning an empty array
        return await getScriptsForRepository(repositoryId);
      } catch (err) {
        console.error(`[DeploymentContext] Error fetching scripts for repository ${repositoryId}:`, err);
        return [];
      }
    });
    
    // Handle null result case
    return result || [];
  }, [protectedFetch]);

  // Update the fetchAvailableHosts to handle null
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

  // Update fetchDeploymentStatus to always return a valid object
  const fetchDeploymentStatus = useCallback(async (id: string): Promise<any> => {
    const result = await protectedFetch(`fetchDeploymentStatus-${id}`, async () => {
      try {
        console.log(`[DeploymentContext] Fetching status for deployment ${id}`);
        // Use the refreshDeployment API to get real status
        const refreshResult = await refreshDeploymentAction(id);
        
        if (refreshResult.success && refreshResult.deployment) {
          return { 
            status: refreshResult.deployment.status, 
            progress: 0, // Default progress since it's not in the type
            deployment: refreshResult.deployment
          };
        }
        
        return { status: 'unknown', progress: 0 };
      } catch (err) {
        console.error(`[DeploymentContext] Error fetching status for deployment ${id}:`, err);
        return null;
      }
    });
    
    // Handle null result case
    return result || { status: 'unknown', progress: 0 };
  }, [protectedFetch]);

  // Add deleteDeployment implementation
  const deleteDeploymentImpl = useCallback(async (id: string): Promise<{
    success: boolean;
    error?: string
  }> => {
    console.log(`[DeploymentContext] Starting deletion process for deployment ${id}`);
    const result = await protectedFetch(`deleteDeployment-${id}`, async () => {
      try {
        console.log(`[DeploymentContext] Deleting deployment ${id}`);
        
        // First remove from local state before API call to make UI feel faster
        // This will be reverted if the deletion fails
        const originalDeployments = [...state.deployments];
        console.log(`[DeploymentContext] Original deployments count: ${originalDeployments.length}`);
        
        const filteredDeployments = state.deployments.filter(d => d.id !== id);
        console.log(`[DeploymentContext] Filtered deployments count: ${filteredDeployments.length}`);
        
        safeUpdateState(
          setState,
          { ...state, deployments: state.deployments },
          {
            ...state,
            deployments: filteredDeployments
          },
          `delete-deployment-${id}-optimistic`
        );
        
        // Then call the API to actually delete
        console.log(`[DeploymentContext] Calling deleteDeployment action for ID: ${id}`);
        const success = await deleteDeployment(id);
        console.log(`[DeploymentContext] deleteDeployment action returned: ${success}`);
        
        if (success) {
          // Force a complete refresh of deployments rather than just using the filtered list
          // This ensures we get the latest state from the server
          console.log(`[DeploymentContext] Successfully deleted deployment ${id}, forcing full refresh`);
          
          // Set loading state to ensure UI shows loading indicator
          safeUpdateState(
            setState,
            { ...state },
            { ...state, loading: true, isRefreshing: true },
            `delete-deployment-${id}-loading`
          );
          
          // Fetch deployments with a short timeout to allow server cache to clear
          setTimeout(() => {
            fetchDeployments(true); // Pass true to force fresh data
          }, 300);
          
          return { success: true };
        } else {
          // Deletion failed, restore the original deployments list
          console.error(`[DeploymentContext] Failed to delete deployment ${id}, restoring local state`);
          safeUpdateState(
            setState,
            { ...state, deployments: state.deployments },
            { ...state, deployments: originalDeployments },
            `delete-deployment-${id}-restore`
          );
          return { success: false, error: 'Failed to delete deployment from database' };
        }
      } catch (err: any) {
        console.error(`[DeploymentContext] Error deleting deployment ${id}:`, err);
        console.error(`[DeploymentContext] Error details:`, JSON.stringify(err, null, 2));
        
        // Ensure deployments list is refreshed to get accurate state
        fetchDeployments();
        
        return { success: false, error: err.message || 'Failed to delete deployment' };
      }
    });
    
    // Handle null result case
    console.log(`[DeploymentContext] Final deletion result:`, result);
    return result || { success: false, error: 'Operation failed' };
  }, [fetchDeployments, protectedFetch, safeUpdateState, state]);

  // Create the context value
  const contextValue: DeploymentContextType = {
    deployments: state.deployments,
    repositories: state.repositories || [],
    loading: state.loading,
    error: state.error,
    isRefreshing: state.isRefreshing,
    currentUser: state.currentUser,
    refreshUserData: async () => {
      await refreshUserData();
      return state.currentUser;
    },
    fetchDeployments: async (forceFresh: boolean = false) => { 
      await fetchDeployments(forceFresh); 
    },
    fetchDeploymentById,
    createDeployment,
    abortDeployment,
    refreshDeployment,
    updateDeployment,
    deleteDeployment: deleteDeploymentImpl,
    fetchScriptsForRepository,
    fetchAvailableHosts,
    fetchRepositories,
    fetchDeploymentStatus
  } as DeploymentContextType;

  // Then, add this effect to persist data:

  // Persist deployment data for cross-page navigation
  useEffect(() => {
    if (typeof persistedData !== 'undefined') {
      persistedData.deploymentData = {
        deployments: state.deployments,
        repositories: state.repositories,
        loading: state.loading,
        error: state.error,
        // Include other state you want to persist
      };
      console.log('[DeploymentContext] Persisted deployment data for cross-page navigation');
    }
  }, [state.deployments, state.repositories, state.loading, state.error]);

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