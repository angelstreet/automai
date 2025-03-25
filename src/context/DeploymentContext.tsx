'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
  useMemo,
} from 'react';
import { Deployment, DeploymentFormData } from '@/app/[locale]/[tenant]/deployment/types';
import {
  getDeployments,
  getDeploymentById,
  createDeployment as createDeploymentAction,
  abortDeployment as abortDeploymentAction,
  refreshDeployment as refreshDeploymentAction,
  updateDeployment,
  deleteDeployment,
  getScriptsForRepository,
} from '@/app/[locale]/[tenant]/deployment/actions';
import { getRepositories } from '@/app/[locale]/[tenant]/repositories/actions';
import { getHosts as getAvailableHosts } from '@/app/[locale]/[tenant]/hosts/actions';
import { DeploymentContextType, DeploymentData } from '@/types/context/deployment';
import { useRequestProtection } from '@/hooks/useRequestProtection';
import { persistedData } from './AppContext';

// Singleton flag to prevent multiple instances
let DEPLOYMENT_CONTEXT_INITIALIZED = false;

const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log(...args);

const useDebounce = (fn: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  return useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        fn(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [fn, delay],
  );
};

const initialState: DeploymentData = {
  deployments: [],
  repositories: [],
  loading: true,
  error: null,
  isRefreshing: false,
  currentUser: null,
  isInitialized: false,
};

const DeploymentContext = createContext<DeploymentContextType | undefined>(undefined);

export const DeploymentProvider: React.FC<{ children: ReactNode; userData?: any | null }> = ({
  children,
  userData,
}) => {
  // Check for multiple instances of DeploymentProvider
  useEffect(() => {
    if (DEPLOYMENT_CONTEXT_INITIALIZED) {
      console.warn('[DeploymentContext] Multiple instances of DeploymentProvider detected');
    } else {
      DEPLOYMENT_CONTEXT_INITIALIZED = true;
      log('[DeploymentContext] DeploymentProvider initialized as singleton');
    }

    return () => {
      if (DEPLOYMENT_CONTEXT_INITIALIZED) {
        DEPLOYMENT_CONTEXT_INITIALIZED = false;
        log('[DeploymentContext] DeploymentProvider singleton instance unmounted');
      }
    };
  }, []);

  const [state, setState] = useState<DeploymentData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem('cached_deployment');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData) as DeploymentData;
          console.log(
            '[DeploymentContext] Using initial cached deployment data:',
            parsedData.deployments?.length || 0,
          );
          return { ...parsedData, loading: false, isInitialized: false };
        }
      } catch (e) {
        log('[DeploymentContext] Error reading from localStorage:', e);
      }
    }
    return initialState;
  });

  const { protectedFetch, safeUpdateState } = useRequestProtection('DeploymentContext');
  const lastFetchTimeRef = useRef<number>(0);

  // Update local state with user data from props if provided
  useEffect(() => {
    if (userData && userData !== state.currentUser) {
      setState((prevState) => ({
        ...prevState,
        currentUser: userData,
      }));
    }
  }, [userData, state.currentUser]);

  useEffect(() => {
    if (state.deployments.length > 0) {
      try {
        localStorage.setItem('cached_deployment', JSON.stringify(state));
        localStorage.setItem('cached_deployment_time', Date.now().toString());
        log('[DeploymentContext] Saved deployment data to localStorage');
      } catch (e) {
        log('[DeploymentContext] Error saving to localStorage:', e);
      }
    }
  }, [state.deployments.length]);

  const fetchRepositories = useCallback(async () => {
    console.log('[DeploymentContext] Fetching repositories');
    try {
      const result = await protectedFetch('fetchRepositories', async () => {
        const response = await getRepositories();
        const data = response?.data || [];
        console.log('[DeploymentContext] Repository data fetched:', data.length);
        return data;
      });
      if (result && Array.isArray(result)) {
        safeUpdateState(
          setState,
          state,
          { ...state, repositories: result },
          'repositories-updated',
        );
        try {
          const updatedState = { ...state, repositories: result };
          localStorage.setItem('cached_deployment', JSON.stringify(updatedState));
          localStorage.setItem('cached_deployment_time', Date.now().toString());
        } catch (e) {
          console.error('[DeploymentContext] Error saving repositories to cache:', e);
        }
      }
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('[DeploymentContext] Error fetching repositories:', error);
      return [];
    }
  }, [protectedFetch, state, safeUpdateState]);

  const fetchDeployments = useCallback(
    async (forceFresh = false) => {
      lastFetchTimeRef.current = Date.now();
      return await protectedFetch('fetchDeployments', async () => {
        try {
          console.log(
            '[DeploymentContext] Fetching deployments' + (forceFresh ? ' (force fresh)' : ''),
          );
          setState((prev) => ({
            ...prev,
            loading: prev.deployments.length === 0,
            isRefreshing: true,
            error: null,
          }));
          if (forceFresh && typeof window !== 'undefined') {
            console.log('[DeploymentContext] Forcing fresh data, clearing localStorage');
            localStorage.removeItem('cached_deployment');
            localStorage.removeItem('cached_deployment_time');
          }
          const deployments = await getDeployments();
          setState((prev) => ({
            ...prev,
            deployments: deployments || [],
            loading: false,
            isRefreshing: false,
            isInitialized: true,
          }));
          console.log('[DeploymentContext] Deployments fetched:', deployments?.length || 0);
          try {
            const updatedState = {
              ...state,
              deployments: deployments || [],
              loading: false,
              isRefreshing: false,
              isInitialized: true,
            };
            localStorage.setItem('cached_deployment', JSON.stringify(updatedState));
            localStorage.setItem('cached_deployment_time', Date.now().toString());
          } catch (e) {
            console.error('[DeploymentContext] Error saving to localStorage:', e);
          }
          return deployments;
        } catch (err: any) {
          console.error('[DeploymentContext] Error fetching deployments:', err);
          setState((prev) => ({
            ...prev,
            loading: false,
            isRefreshing: false,
            error: err.message || 'Failed to fetch',
            isInitialized: true,
          }));
          return null;
        }
      });
    },
    [state, protectedFetch],
  );

  const debouncedFetchDeployments = useDebounce(fetchDeployments, 300);

  useEffect(() => {
    if (!state.isInitialized) {
      console.log('[DeploymentContext] Initializing data');
      debouncedFetchDeployments();
    }
  }, [debouncedFetchDeployments, state.isInitialized]);

  useEffect(() => {
    if (state.deployments.length > 0 && !state.loading) {
      console.log('[DeploymentContext] Deployments loaded:', { count: state.deployments.length });
    }
  }, [state.deployments.length, state.loading]);

  const fetchDeploymentById = useCallback(
    async (id: string) => {
      return await protectedFetch(`fetchDeployment-${id}`, async () => {
        const cachedDeployment = state.deployments.find((d) => d.id === id);
        if (cachedDeployment) {
          console.log(`[DeploymentContext] Found deployment ${id} in state cache`);
          return cachedDeployment;
        }
        console.log(`[DeploymentContext] Fetching deployment ${id} from server`);
        return await getDeploymentById(id);
      });
    },
    [protectedFetch, state],
  );

  const createDeployment = useCallback(
    async (formData: DeploymentFormData) => {
      const result = await protectedFetch('createDeployment', async () => {
        try {
          console.log('[DeploymentContext] Creating new deployment');
          const apiResult = (await createDeploymentAction(formData)) as {
            success: boolean;
            data?: { id: string };
            error?: string;
          };
          if (apiResult?.success && apiResult.data?.id) {
            fetchDeployments();
            return { success: true, deploymentId: apiResult.data.id };
          }
          return { success: false, error: apiResult?.error || 'Failed to create deployment' };
        } catch (err: any) {
          console.error('[DeploymentContext] Error creating deployment:', err);
          return { success: false, error: err.message || 'Failed to create deployment' };
        }
      });
      return result || { success: false, error: 'Operation failed' };
    },
    [fetchDeployments, protectedFetch],
  );

  const abortDeployment = useCallback(
    async (id: string) => {
      const result = await protectedFetch(`abortDeployment-${id}`, async () => {
        try {
          console.log(`[DeploymentContext] Aborting deployment ${id}`);
          const result = await abortDeploymentAction(id);
          if (result?.success) {
            fetchDeployments();
            return { success: true };
          }
          return { success: false, error: result?.error || 'Failed to abort deployment' };
        } catch (err: any) {
          console.error(`[DeploymentContext] Error aborting deployment ${id}:`, err);
          return { success: false, error: err.message || 'Failed to abort deployment' };
        }
      });
      return result || { success: false, error: 'Operation failed' };
    },
    [fetchDeployments, protectedFetch],
  );

  const refreshDeployment = useCallback(
    async (id: string) => {
      const result = await protectedFetch(`refreshDeployment-${id}`, async () => {
        try {
          console.log(`[DeploymentContext] Refreshing deployment ${id}`);
          const result = await refreshDeploymentAction(id);
          if (result?.deployment) {
            safeUpdateState(
              setState,
              state,
              {
                ...state,
                deployments: state.deployments.map((d) =>
                  d.id === id && result.deployment ? result.deployment : d,
                ),
              },
              `deployment-${id}`,
            );
            return { success: true, deployment: result.deployment };
          }
          return { success: false, error: result?.error || 'Failed to refresh deployment' };
        } catch (err: any) {
          console.error(`[DeploymentContext] Error refreshing deployment ${id}:`, err);
          return { success: false, error: err.message || 'Failed to refresh deployment' };
        }
      });
      return result || { success: false, error: 'Operation failed' };
    },
    [protectedFetch, safeUpdateState, state],
  );

  const fetchScriptsForRepository = useCallback(
    async (repositoryId: string) => {
      const cachedScripts = persistedData.scriptCache?.[repositoryId];
      if (cachedScripts) {
        log(`[DeploymentContext] Using cached scripts for repository ${repositoryId}`);
        return cachedScripts;
      }
      const result = await protectedFetch(`fetchScripts-${repositoryId}`, async () => {
        console.log(`[DeploymentContext] Fetching scripts for repository ${repositoryId}`);
        const scripts = await getScriptsForRepository(repositoryId);
        if (!persistedData.scriptCache) persistedData.scriptCache = {};
        persistedData.scriptCache[repositoryId] = scripts;
        return scripts;
      });
      return result || [];
    },
    [protectedFetch],
  );

  const fetchAvailableHosts = useCallback(async () => {
    const result = await protectedFetch('fetchAvailableHosts', async () => {
      console.log('[DeploymentContext] Fetching available hosts');
      const response = await getAvailableHosts();
      return response?.data || [];
    });
    return result || [];
  }, [protectedFetch]);

  const fetchDeploymentStatus = useCallback(
    async (id: string) => {
      const result = await protectedFetch(`fetchDeploymentStatus-${id}`, async () => {
        console.log(`[DeploymentContext] Fetching status for deployment ${id}`);
        const refreshResult = await refreshDeploymentAction(id);
        if (refreshResult.success && refreshResult.deployment) {
          return {
            status: refreshResult.deployment.status,
            progress: 0,
            deployment: refreshResult.deployment,
          };
        }
        return { status: 'unknown', progress: 0 };
      });
      return result || { status: 'unknown', progress: 0 };
    },
    [protectedFetch],
  );

  const deleteDeploymentImpl = useCallback(
    async (id: string) => {
      const result = await protectedFetch(`deleteDeployment-${id}`, async () => {
        try {
          console.log(`[DeploymentContext] Deleting deployment ${id}`);
          const originalDeployments = [...state.deployments];
          const filteredDeployments = state.deployments.filter((d) => d.id !== id);
          safeUpdateState(
            setState,
            state,
            { ...state, deployments: filteredDeployments },
            `delete-deployment-${id}-optimistic`,
          );
          const success = await deleteDeployment(id);
          if (success) {
            console.log(
              `[DeploymentContext] Successfully deleted deployment ${id}, forcing refresh`,
            );
            safeUpdateState(
              setState,
              state,
              { ...state, loading: true, isRefreshing: true },
              `delete-deployment-${id}-loading`,
            );
            setTimeout(() => fetchDeployments(true), 300);
            return { success: true };
          } else {
            safeUpdateState(
              setState,
              state,
              { ...state, deployments: originalDeployments },
              `delete-deployment-${id}-restore`,
            );
            return { success: false, error: 'Failed to delete deployment from database' };
          }
        } catch (err: any) {
          console.error(`[DeploymentContext] Error deleting deployment ${id}:`, err);
          fetchDeployments();
          return { success: false, error: err.message || 'Failed to delete deployment' };
        }
      });
      return result || { success: false, error: 'Operation failed' };
    },
    [fetchDeployments, protectedFetch, safeUpdateState, state],
  );

  // Create context value with proper memoization
  const contextValue = useMemo(
    () => ({
      deployments: state.deployments,
      repositories: state.repositories || [],
      loading: state.loading,
      error: state.error,
      isRefreshing: state.isRefreshing,
      currentUser: state.currentUser,
      isInitialized: state.isInitialized,
      refreshUserData: async () => {
        return state.currentUser;
      },
      fetchDeployments: debouncedFetchDeployments,
      fetchDeploymentById,
      createDeployment,
      abortDeployment,
      refreshDeployment,
      updateDeployment,
      deleteDeployment: deleteDeploymentImpl,
      fetchScriptsForRepository,
      fetchAvailableHosts,
      fetchRepositories,
      fetchDeploymentStatus,
    }),
    [
      state.deployments,
      state.repositories,
      state.loading,
      state.error,
      state.isRefreshing,
      state.currentUser,
      state.isInitialized,
      debouncedFetchDeployments,
      fetchDeploymentById,
      createDeployment,
      abortDeployment,
      refreshDeployment,
      updateDeployment,
      deleteDeploymentImpl,
      fetchScriptsForRepository,
      fetchAvailableHosts,
      fetchRepositories,
      fetchDeploymentStatus,
    ],
  );

  // Persist deployment data for cross-page navigation
  useEffect(() => {
    if (typeof persistedData !== 'undefined') {
      persistedData.deploymentData = {
        deployments: state.deployments,
        repositories: state.repositories,
        loading: state.loading,
        error: state.error,
      };
      console.log('[DeploymentContext] Persisted deployment data');
    }
  }, [state.deployments, state.repositories, state.loading, state.error]);
  
  return <DeploymentContext.Provider value={contextValue}>{children}</DeploymentContext.Provider>;
};

export function useDeployment() {
  const context = useContext(DeploymentContext);
  
  // If the context is null for some reason, return a safe default object
  if (!context) {
    console.warn('[useDeployment] Deployment context is null, returning fallback');
    return {
      deployments: [],
      repositories: [],
      loading: true,
      error: null,
      isRefreshing: false,
      currentUser: null,
      isInitialized: false,
      refreshUserData: async () => null,
      fetchDeployments: async () => null,
      fetchDeploymentById: async () => null,
      createDeployment: async () => ({ success: false, error: 'Context not available' }),
      abortDeployment: async () => ({ success: false, error: 'Context not available' }),
      refreshDeployment: async () => ({ success: false, error: 'Context not available' }),
      updateDeployment: async () => ({ success: false, error: 'Context not available' }),
      deleteDeployment: async () => ({ success: false, error: 'Context not available' }),
      fetchScriptsForRepository: async () => [],
      fetchAvailableHosts: async () => [],
      fetchRepositories: async () => [],
      fetchDeploymentStatus: async () => ({ status: 'unknown', progress: 0 }),
    };
  }
  
  return context;
}