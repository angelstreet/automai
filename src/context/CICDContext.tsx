'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { 
  getCICDProviders,
  createCICDProviderAction,
  updateCICDProviderAction,
  deleteCICDProviderAction,
  testCICDProviderAction
} from '@/app/[locale]/[tenant]/cicd/actions';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';
import {
  CICDProviderType,
  CICDProviderPayload,
  CICDJob,
  ActionResult,
  CICDContextType,
  CICDData
} from '@/app/[locale]/[tenant]/cicd/types';
import { useRequestProtection } from '@/hooks/useRequestProtection';
import {
  DEBUG,
  STORAGE_KEYS,
  INITIAL_STATE,
  ERROR_MESSAGES,
  LOG_PREFIX
} from '@/app/[locale]/[tenant]/cicd/constants';

// Reduce logging with a DEBUG flag
const log = (...args: any[]) => DEBUG && console.log(...args);

// Create context
const CICDContext = createContext<CICDContextType | undefined>(undefined);

// Provider component
export const CICDProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  log(`${LOG_PREFIX} CICDProvider initializing`);
  
  // Get initial CICD data synchronously from localStorage
  const [state, setState] = useState<CICDData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem(STORAGE_KEYS.CACHED_CICD);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData) as CICDData;
          log(`${LOG_PREFIX} Using initial cached CICD data from localStorage`);
          return parsedData;
        }
      } catch (e) {
        // Ignore localStorage errors
        log(`${LOG_PREFIX} Error reading from localStorage:`, e);
      }
    }
    return INITIAL_STATE;
  });
  
  // Add render count for debugging
  const renderCount = useRef<number>(0);
  
  // Add request protection
  const { protectedFetch, safeUpdateState, renderCount: protectedRenderCount } = useRequestProtection('CICDContext');
  
  // Add initialization tracker
  const initialized = useRef(false);
  
  // Fetch user data
  const fetchUserData = useCallback(async (): Promise<AuthUser | null> => {
    return await protectedFetch('fetchUserData', async () => {
      try {
        const user = await getUser();
        
        safeUpdateState(
          setState,
          { ...state, currentUser: state.currentUser },
          { ...state, currentUser: user },
          'currentUser'
        );
        
        return user;
      } catch (err) {
        console.error('Error fetching user data:', err);
        return null;
      }
    });
  }, [protectedFetch, safeUpdateState, state]);

  // Fetch CI/CD providers
  const fetchProviders = useCallback(async () => {
    return await protectedFetch('fetchProviders', async () => {
      setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));
      
      try {
        // Use cached user data when available
        const user = state.currentUser || await fetchUserData();
        
        console.log(`${LOG_PREFIX} fetchProviders called`, {
          hasUser: !!user,
          renderCount: renderCount,
          componentState: 'loading'
        });
        
        // Pass user data to the server action to avoid redundant auth
        const result = await getCICDProviders(user, 'CICDContext', renderCount);
        
        if (result.success) {
          safeUpdateState(
            setState,
            { ...state, providers: state.providers },
            {
              ...state,
              providers: result.data || [],
              loading: false
            },
            'providers'
          );
          
          console.log(`${LOG_PREFIX} fetchProviders complete`, {
            providerCount: result.data?.length || 0,
            componentState: 'loaded'
          });
          
          return result;
        } else {
          setState((prev: CICDData) => ({
            ...prev,
            error: result.error || ERROR_MESSAGES.FETCH_PROVIDERS,
            loading: false
          }));
          
          console.error(`${LOG_PREFIX} Error fetching providers:`, result.error);
          return result;
        }
      } catch (err: any) {
        console.error(`${LOG_PREFIX} Unexpected error in fetchProviders:`, err);
        
        setState((prev: CICDData) => ({
          ...prev,
          error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
          loading: false
        }));
        
        return {
          success: false,
          data: [],
          error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR
        };
      }
    });
  }, [protectedFetch, safeUpdateState, state, fetchUserData, renderCount]);

  // Get provider by ID
  const getProviderById = useCallback(async (id: string): Promise<CICDProviderType | null> => {
    try {
      // First check if we already have the provider in state
      const cachedProvider = state.providers.find((p: CICDProviderType) => p.id === id);
      if (cachedProvider) {
        return cachedProvider;
      }
      
      // If not found in state, fetch all providers then find the one we need
      const result = await fetchProviders();
      
      if (result && result.success && result.data) {
        const provider = result.data.find((p: CICDProviderType) => p.id === id);
        return provider || null;
      }
      
      return null;
    } catch (err) {
      console.error(`Error getting CI/CD provider ${id}:`, err);
      return null;
    }
  }, [state.providers, fetchProviders]);

  // Create a new CI/CD provider
  const createProvider = useCallback(async (payload: CICDProviderPayload) => {
    setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await createCICDProviderAction(payload);
      
      if (result.success && result.data) {
        // Update the local state with the new provider
        setState((prev: CICDData) => ({
          ...prev,
          providers: [...prev.providers, result.data!],
          loading: false
        }));
      } else {
        setState((prev: CICDData) => ({
          ...prev,
          error: result.error || ERROR_MESSAGES.CREATE_PROVIDER,
          loading: false
        }));
      }
      
      return result;
    } catch (err: any) {
      setState((prev: CICDData) => ({
        ...prev,
        error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
        loading: false
      }));
      
      return {
        success: false,
        error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR
      };
    }
  }, []);

  // Update an existing CI/CD provider
  const updateProvider = useCallback(async (id: string, payload: CICDProviderPayload) => {
    setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await updateCICDProviderAction(id, payload);
      
      if (result.success && result.data) {
        // Update the provider in local state
        setState((prev: CICDData) => ({
          ...prev,
          providers: prev.providers.map((p: CICDProviderType) => 
            p.id === id ? result.data! : p
          ),
          loading: false
        }));
      } else {
        setState((prev: CICDData) => ({
          ...prev,
          error: result.error || ERROR_MESSAGES.UPDATE_PROVIDER,
          loading: false
        }));
      }
      
      return result;
    } catch (err: any) {
      setState((prev: CICDData) => ({
        ...prev,
        error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
        loading: false
      }));
      
      return {
        success: false,
        error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR
      };
    }
  }, []);

  // Delete a CI/CD provider
  const deleteProvider = useCallback(async (id: string): Promise<ActionResult> => {
    setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await deleteCICDProviderAction(id);
      
      if (result.success) {
        // Remove the provider from local state
        setState((prev: CICDData) => ({
          ...prev,
          providers: prev.providers.filter((p: CICDProviderType) => p.id !== id),
          loading: false
        }));
      } else {
        setState((prev: CICDData) => ({
          ...prev,
          error: result.error || ERROR_MESSAGES.DELETE_PROVIDER,
          loading: false
        }));
      }
      
      return result;
    } catch (err: any) {
      setState((prev: CICDData) => ({
        ...prev,
        error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
        loading: false
      }));
      
      return {
        success: false,
        error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR
      };
    }
  }, []);

  // Test a CI/CD provider connection
  const testProvider = useCallback(async (provider: CICDProviderPayload): Promise<ActionResult> => {
    setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await testCICDProviderAction(provider);
      
      setState((prev: CICDData) => ({
        ...prev,
        loading: false,
        error: result.success ? null : (result.error || ERROR_MESSAGES.TEST_PROVIDER)
      }));
      
      return result;
    } catch (err: any) {
      setState((prev: CICDData) => ({
        ...prev,
        error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
        loading: false
      }));
      
      return {
        success: false,
        error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR
      };
    }
  }, []);
  
  // Select a provider
  const selectProvider = useCallback((provider: CICDProviderType | null) => {
    setState((prev: CICDData) => ({
      ...prev,
      selectedProvider: provider
    }));
  }, []);
  
  // Select a job
  const selectJob = useCallback((job: CICDJob | null) => {
    setState((prev: CICDData) => ({
      ...prev,
      selectedJob: job
    }));
  }, []);
  
  // Initialize CI/CD data
  useEffect(() => {
    log(`${LOG_PREFIX} Initializing CICDContext...`);
    
    const initialize = async () => {
      // Prevent double initialization
      if (initialized.current) {
        log(`${LOG_PREFIX} Already initialized, skipping`);
        return;
      }
      
      initialized.current = true;
      await fetchUserData();
      await fetchProviders();
      
      // Cache CICD data in localStorage after successful fetch
      if (state.providers.length > 0) {
        try {
          localStorage.setItem(STORAGE_KEYS.CACHED_CICD, JSON.stringify(state));
          localStorage.setItem(STORAGE_KEYS.CACHED_CICD_TIME, Date.now().toString());
          log(`${LOG_PREFIX} Saved CICD data to localStorage cache`);
        } catch (e) {
          log(`${LOG_PREFIX} Error saving to localStorage:`, e);
        }
      }
    };
    
    initialize();
    
    return () => {
      log(`${LOG_PREFIX} CICDContext unmounting...`);
      initialized.current = false;
    };
  }, [fetchUserData, fetchProviders]);
  
  // Add one useful log when providers are loaded
  useEffect(() => {
    if (state.providers.length > 0 && !state.loading) {
      console.log(`${LOG_PREFIX} CICD providers loaded:`, { 
        count: state.providers.length
      });
    }
  }, [state.providers.length, state.loading]);
  
  // Create context value
  const contextValue: CICDContextType = {
    // State
    ...state,
    
    // Actions
    fetchProviders: async () => {
      const result = await fetchProviders();
      return result || { success: false, data: [], error: 'Failed to fetch providers' };
    },
    getProviderById,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    selectedProvider: state.selectedProvider,
    selectedJob: state.selectedJob,
    fetchUserData,
    
    // Implementations for required methods with proper error logging
    fetchJobs: async () => {
      console.error('CICD: fetchJobs not fully implemented yet');
      return [];
    },
    getJobById: async (id: string) => {
      console.error(`CICD: getJobById not fully implemented yet for job ${id}`);
      return null;
    },
    triggerJob: async (jobId: string, params?: any) => {
      console.error(`CICD: triggerJob not fully implemented yet for job ${jobId}`);
      return { success: false, error: "Not fully implemented yet" };
    },
    getBuildStatus: async (buildId: string) => {
      console.error(`CICD: getBuildStatus not fully implemented yet for build ${buildId}`);
      return null;
    },
    getBuildLogs: async (buildId: string) => {
      console.error(`CICD: getBuildLogs not fully implemented yet for build ${buildId}`);
      return "";
    },
    
    // UI state management
    setSelectedProvider: (provider: CICDProviderType | null) => setState((prev: CICDData) => ({ ...prev, selectedProvider: provider })),
    setSelectedJob: (job: CICDJob | null) => setState((prev: CICDData) => ({ ...prev, selectedJob: job })),
    refreshUserData: fetchUserData
  };
  
  return (
    <CICDContext.Provider value={contextValue}>
      {children}
    </CICDContext.Provider>
  );
};

// Export the hook for accessing the CICD context
export function useCICDContext() {
  const context = useContext(CICDContext);
  console.log('[DEBUG] useCICDContext called, returning:', {
    isNull: context === null,
    hasProviders: context ? !!context.providers : false,
    providersCount: context?.providers?.length || 0
  });
  
  if (!context) {
    throw new Error(ERROR_MESSAGES.CONTEXT_USAGE);
  }
  
  return context;
} 