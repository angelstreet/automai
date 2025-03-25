'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useRef,
  useMemo,
} from 'react';
import {
  getCICDProviders,
  createCICDProviderAction,
  updateCICDProviderAction,
  deleteCICDProviderAction,
  testCICDProviderAction,
  getCICDJobs,
} from '@/app/[locale]/[tenant]/cicd/actions';
import {
  CICDProviderType,
  CICDProviderPayload,
  CICDJob,
  ActionResult,
  CICDContextType,
  CICDData,
} from '@/app/[locale]/[tenant]/cicd/types';
import { useRequestProtection } from '@/hooks/useRequestProtection';
import {
  DEBUG,
  STORAGE_KEYS,
  INITIAL_STATE,
  ERROR_MESSAGES,
  LOG_PREFIX,
} from '@/app/[locale]/[tenant]/cicd/constants';
import { persistedData } from './AppContext';

// Reduce logging with a DEBUG flag
const log = (...args: any[]) => DEBUG && console.log(...args);

// Singleton flag to detect multiple instances
let CICD_CONTEXT_INITIALIZED = false;

// Create context
const CICDContext = createContext<CICDContextType | undefined>(undefined);

// Provider component
export const CICDProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Singleton check
  useEffect(() => {
    if (CICD_CONTEXT_INITIALIZED) {
      console.error(
        `${LOG_PREFIX} Multiple CICDProvider instances detected! ` +
          'This will cause serious performance and state problems.'
      );
    } else {
      CICD_CONTEXT_INITIALIZED = true;
      log(`${LOG_PREFIX} CICDProvider initialized as singleton`);
    }

    return () => {
      // Only reset if this instance set it to true
      if (CICD_CONTEXT_INITIALIZED) {
        CICD_CONTEXT_INITIALIZED = false;
        log(`${LOG_PREFIX} CICDProvider singleton instance unmounted`);
      }
    };
  }, []);

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
  renderCount.current++;

  // Add request protection
  const {
    protectedFetch,
    safeUpdateState,
    renderCount: protectedRenderCount,
  } = useRequestProtection('CICDContext');

  // Add initialization tracker
  const initialized = useRef(false);

  // Helper function to get user data from state
  const getUserData = useCallback(() => {
    return state.currentUser;
  }, [state.currentUser]);

  // Fetch CI/CD providers
  const fetchProviders = useCallback(async () => {
    try {
      return await protectedFetch('fetchProviders', async () => {
        setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));

        try {
          // No need for authentication check here, it's handled by AppContext
          log(`${LOG_PREFIX} fetchProviders called`, {
            renderCount: renderCount.current,
            componentState: 'loading'
          });

          // Pass user data to the server action
          const result = await getCICDProviders(state.currentUser);

          if (result.success) {
            safeUpdateState(
              setState,
              { ...state, providers: state.providers },
              {
                ...state,
                providers: result.data || [],
                loading: false,
              },
              'providers',
            );

            log(`${LOG_PREFIX} fetchProviders complete`, {
              providerCount: result.data?.length || 0,
              componentState: 'loaded',
            });

            return result;
          } else {
            setState((prev: CICDData) => ({
              ...prev,
              error: result.error || ERROR_MESSAGES.FETCH_PROVIDERS,
              loading: false,
            }));

            console.error(`${LOG_PREFIX} Error fetching providers:`, result.error);
            return result;
          }
        } catch (err: any) {
          console.error(`${LOG_PREFIX} Unexpected error in fetchProviders:`, err);

          setState((prev: CICDData) => ({
            ...prev,
            error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
            loading: false,
          }));

          return {
            success: false,
            data: [],
            error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
          };
        }
      });
    } catch (err) {
      // This catch handles any errors from protectedFetch itself
      console.error(`${LOG_PREFIX} Error in fetchProviders wrapper:`, err);
      return {
        success: false,
        data: [],
        error: err instanceof Error ? err.message : 'Unknown error in fetch providers'
      };
    }
  }, [protectedFetch, safeUpdateState, state.currentUser]);

  // Get provider by ID
  const getProviderById = useCallback(
    async (id: string): Promise<CICDProviderType | null> => {
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
        console.error(`${LOG_PREFIX} Error getting CI/CD provider ${id}:`, err);
        return null;
      }
    },
    [state.providers, fetchProviders],
  );

  // Create a new CI/CD provider
  const createProvider = useCallback(
    async (payload: CICDProviderPayload) => {
      setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));

      try {
        // Pass user data to action
        const result = await createCICDProviderAction(payload, state.currentUser);

        if (result.success && result.data) {
          // Update the local state with the new provider
          setState((prev: CICDData) => ({
            ...prev,
            providers: [...prev.providers, result.data!],
            loading: false,
          }));
        } else {
          setState((prev: CICDData) => ({
            ...prev,
            error: result.error || ERROR_MESSAGES.CREATE_PROVIDER,
            loading: false,
          }));
        }

        return result;
      } catch (err: any) {
        setState((prev: CICDData) => ({
          ...prev,
          error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
          loading: false,
        }));

        return {
          success: false,
          error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
        };
      }
    },
    [state.currentUser],
  );

  // Update an existing CI/CD provider
  const updateProvider = useCallback(
    async (id: string, payload: CICDProviderPayload) => {
      setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));

      try {
        // Pass user data to action
        const result = await updateCICDProviderAction(id, payload, state.currentUser);

        if (result.success && result.data) {
          // Update the provider in local state
          setState((prev: CICDData) => ({
            ...prev,
            providers: prev.providers.map((p: CICDProviderType) =>
              p.id === id ? result.data! : p,
            ),
            loading: false,
          }));
        } else {
          setState((prev: CICDData) => ({
            ...prev,
            error: result.error || ERROR_MESSAGES.UPDATE_PROVIDER,
            loading: false,
          }));
        }

        return result;
      } catch (err: any) {
        setState((prev: CICDData) => ({
          ...prev,
          error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
          loading: false,
        }));

        return {
          success: false,
          error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
        };
      }
    },
    [state.currentUser],
  );

  // Delete a CI/CD provider
  const deleteProvider = useCallback(
    async (id: string): Promise<ActionResult> => {
      setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));

      try {
        // Pass user data to action
        const result = await deleteCICDProviderAction(id, state.currentUser);

        if (result.success) {
          // Remove the provider from local state
          setState((prev: CICDData) => ({
            ...prev,
            providers: prev.providers.filter((p: CICDProviderType) => p.id !== id),
            loading: false,
          }));
        } else {
          setState((prev: CICDData) => ({
            ...prev,
            error: result.error || ERROR_MESSAGES.DELETE_PROVIDER,
            loading: false,
          }));
        }

        return result;
      } catch (err: any) {
        setState((prev: CICDData) => ({
          ...prev,
          error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
          loading: false,
        }));

        return {
          success: false,
          error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
        };
      }
    },
    [state.currentUser],
  );

  // Test a CI/CD provider connection
  const testProvider = useCallback(
    async (provider: CICDProviderPayload): Promise<ActionResult> => {
      setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));

      try {
        // Pass user data to action
        const result = await testCICDProviderAction(provider, state.currentUser);

        setState((prev: CICDData) => ({
          ...prev,
          loading: false,
          error: result.success ? null : result.error || ERROR_MESSAGES.TEST_PROVIDER,
        }));

        return result;
      } catch (err: any) {
        setState((prev: CICDData) => ({
          ...prev,
          error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
          loading: false,
        }));

        return {
          success: false,
          error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
        };
      }
    },
    [state.currentUser],
  );

  // Select a provider
  const selectProvider = useCallback((provider: CICDProviderType | null) => {
    setState((prev: CICDData) => ({
      ...prev,
      selectedProvider: provider,
    }));
  }, []);

  // Select a job
  const selectJob = useCallback((job: CICDJob | null) => {
    setState((prev: CICDData) => ({
      ...prev,
      selectedJob: job,
    }));
  }, []);

  // Initialize by fetching CICD data
  useEffect(() => {
    const initializeCICD = async () => {
      // Check if already initialized or has persisted data
      if (initialized.current) {
        return;
      }

      // First check if we have persisted data from persistedData
      if (persistedData?.cicd?.providers?.length > 0) {
        log(
          `${LOG_PREFIX} Using persistedData CICD data:`,
          persistedData.cicd.providers.length,
          'providers',
        );

        // Update state with persisted data
        setState((prevState) => ({
          ...prevState,
          providers: persistedData.cicd.providers,
          jobs: persistedData.cicd.jobs || [],
          loading: false,
        }));

        initialized.current = true;
        // Still fetch in background to refresh data
        fetchProviders();
        return;
      }

      // Check legacy persistedData format
      if (persistedData?.cicdData?.providers?.length > 0) {
        log(
          `${LOG_PREFIX} Using legacy persisted CICD data:`,
          persistedData.cicdData.providers.length,
          'providers',
        );

        // Update state with persisted data
        setState((prevState) => ({
          ...prevState,
          providers: persistedData.cicdData.providers,
          jobs: persistedData.cicdData.jobs || [],
          loading: false,
        }));

        initialized.current = true;
        // Still fetch in background to refresh data
        fetchProviders();
        return;
      }

      // Set loading state
      setState((prevState) => ({ ...prevState, loading: true, error: null }));

      try {
        // Fetch CICD providers
        const providersResponse = await getCICDProviders(state.currentUser);

        if (!providersResponse.success) {
          throw new Error(providersResponse.error || 'Failed to fetch CICD providers');
        }

        // Fetch CICD jobs if providers were retrieved successfully
        const jobsResponse = await getCICDJobs(state.currentUser);

        // Update state with fetched data
        setState((prevState) => ({
          ...prevState,
          providers: providersResponse.data || [],
          jobs: jobsResponse.success ? jobsResponse.data : [],
          loading: false,
        }));

        log(`${LOG_PREFIX} Initialized with:`, providersResponse.data?.length || 0, 'providers');
      } catch (err) {
        console.error(`${LOG_PREFIX} Error initializing CICD context:`, err);
        setState((prevState) => ({
          ...prevState,
          error: err.message || 'Failed to initialize CICD context',
          loading: false,
        }));
      }

      initialized.current = true;
    };

    initializeCICD();
  }, [state.currentUser, fetchProviders]); 

  // Add one useful log when providers are loaded
  useEffect(() => {
    if (state.providers.length > 0 && !state.loading) {
      log(`${LOG_PREFIX} CICD providers loaded:`, {
        count: state.providers.length,
      });
    }
  }, [state.providers.length, state.loading]);

  // Persist CICD data for cross-page navigation
  useEffect(() => {
    if (typeof persistedData !== 'undefined' && state.providers.length > 0) {
      persistedData.cicd = {
        providers: state.providers,
        jobs: state.jobs,
        loading: state.loading,
        error: state.error,
      };
      log(`${LOG_PREFIX} Persisted CICD data for cross-page navigation`);
    }
  }, [state.providers, state.jobs, state.loading, state.error]);

  // Create context value - use useMemo to prevent unnecessary rerenders
  const contextValue = useMemo(
    () => ({
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
      fetchUserData: async () => state.currentUser,

      // Jobs actions
      fetchJobs: async (providerId?: string) => {
        try {
          setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));
          
          // Make the API call to get jobs
          const result = await getCICDJobs(providerId || '', state.currentUser);
          
          if (result.success) {
            setState((prev: CICDData) => ({
              ...prev,
              jobs: result.data || [],
              loading: false,
            }));
            
            return result.data || [];
          } else {
            setState((prev: CICDData) => ({
              ...prev,
              error: result.error || 'Failed to fetch jobs',
              loading: false,
            }));
            
            return [];
          }
        } catch (err: any) {
          console.error(`Error fetching jobs:`, err);
          setState((prev: CICDData) => ({
            ...prev,
            error: err.message || 'Unexpected error',
            loading: false,
          }));
          
          return [];
        }
      },
      getJobById: async (id: string) => {
        try {
          setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));
          console.log(`${LOG_PREFIX} Getting job by ID: ${id}`);
          
          // Find job in current state first
          const job = state.jobs.find((j: CICDJob) => j.id === id);
          if (job) {
            return job;
          }
          
          // If not found, try fetching all jobs
          const result = await getCICDJobs('', state.currentUser);
          if (!result.success) {
            throw new Error(result.error || 'Failed to fetch jobs');
          }
          
          const fetchedJob = result.data?.find((j: CICDJob) => j.id === id);
          if (!fetchedJob) {
            throw new Error(`Job with ID ${id} not found`);
          }
          
          // Update state with new jobs
          setState((prev: CICDData) => ({
            ...prev,
            jobs: result.data || [],
            loading: false
          }));
          
          return fetchedJob;
        } catch (err: any) {
          console.error(`${LOG_PREFIX} Error getting job by ID:`, err);
          setState((prev: CICDData) => ({
            ...prev,
            error: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
            loading: false,
          }));
          return null;
        }
      },
    }),
    [state, fetchProviders],
  );

  return (
    <CICDContext.Provider value={contextValue}>
      {children}
    </CICDContext.Provider>
  );
};

// Use context
export const useCICD = () => {
  const context = useContext(CICDContext);
  if (context === undefined) {
    throw new Error('useCICD must be used within a CICDProvider');
  }
  return context;
};