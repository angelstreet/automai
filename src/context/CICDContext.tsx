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
import { AuthUser } from '@/types/user';
import { useUser } from './UserContext'; // Direct import to avoid circular dependency
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
          'This will cause serious performance and state problems. ' +
          'Ensure CICDProvider is used only once at the root of your application.',
      );

      // Add visible console warning in development
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        console.warn(
          '%c[CRITICAL ERROR] Multiple CICDProvider instances detected!',
          'color: red; font-size: 16px; font-weight: bold;',
        );
      }
    } else {
      CICD_CONTEXT_INITIALIZED = true;
      log(`${LOG_PREFIX} CICDProvider initialized as singleton`);

      // Mark context as initialized in global tracking
      // We've removed the global initialization tracking in our simplified architecture
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

  // Get user data from UserContext instead of fetching it directly
  const userContext = useUser();

  // Helper function to get user data from various sources
  const getUserData = useCallback((): AuthUser | null => {
    // Try to get user from state first
    if (state.currentUser) {
      return state.currentUser;
    }

    // If not in state, try to get from user context
    if (userContext?.user) {
      return userContext.user;
    }

    // Otherwise return null
    return null;
  }, [state.currentUser, userContext?.user]);

  // Update currentUser in state when userContext.user changes
  useEffect(() => {
    if (userContext?.user) {
      safeUpdateState(
        setState,
        { ...state, currentUser: state.currentUser },
        { ...state, currentUser: userContext.user },
        'currentUser',
      );
    }
  }, [userContext?.user, safeUpdateState, state]);

  // This function now uses the user from context instead of fetching it again
  const fetchUserData = useCallback(async (): Promise<AuthUser | null> => {
    return await protectedFetch('fetchUserData', async () => {
      try {
        // First try to get user from context
        let user = getUserData();

        // If no user found and userContext exists, try to refresh user data
        if (!user && userContext?.refreshUser) {
          log(`${LOG_PREFIX} No user data found, refreshing from UserContext...`);
          const refreshResult = await userContext.refreshUser();
          if (refreshResult?.success) {
            user = refreshResult.data;
          }
        }

        // Update state if user was found
        if (user) {
          safeUpdateState(
            setState,
            { ...state, currentUser: state.currentUser },
            { ...state, currentUser: user },
            'currentUser',
          );
        }

        return user;
      } catch (err) {
        console.error(`${LOG_PREFIX} Error in fetchUserData:`, err);
        return null;
      }
    });
  }, [protectedFetch, safeUpdateState, state, userContext, getUserData]);

  // Fetch CI/CD providers
  const fetchProviders = useCallback(async () => {
    return await protectedFetch('fetchProviders', async () => {
      setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));

      try {
        // Use getUserData helper to get user from various sources
        const user = getUserData();

        log(`${LOG_PREFIX} fetchProviders called`, {
          hasUser: !!user,
          renderCount: renderCount.current,
          componentState: 'loading',
          userFromContext: !!userContext?.user,
        });

        // Pass user data to the server action to avoid redundant auth
        const result = await getCICDProviders(user);

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
  }, [protectedFetch, safeUpdateState, state, getUserData]);

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
        // Get current user
        const user = getUserData();

        // Pass user data to action to avoid redundant auth
        const result = await createCICDProviderAction(payload, user);

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
    [getUserData],
  );

  // Update an existing CI/CD provider
  const updateProvider = useCallback(
    async (id: string, payload: CICDProviderPayload) => {
      setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));

      try {
        // Get current user
        const user = getUserData();

        // Pass user data to action to avoid redundant auth
        const result = await updateCICDProviderAction(id, payload, user);

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
    [getUserData],
  );

  // Delete a CI/CD provider
  const deleteProvider = useCallback(
    async (id: string): Promise<ActionResult> => {
      setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));

      try {
        // Get current user
        const user = getUserData();

        // Pass user data to action to avoid redundant auth
        const result = await deleteCICDProviderAction(id, user);

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
    [getUserData],
  );

  // Test a CI/CD provider connection
  const testProvider = useCallback(
    async (provider: CICDProviderPayload): Promise<ActionResult> => {
      setState((prev: CICDData) => ({ ...prev, loading: true, error: null }));

      try {
        // Get current user
        const user = getUserData();

        // Pass user data to action to avoid redundant auth
        const result = await testCICDProviderAction(provider, user);

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
    [getUserData],
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

      // First check if we have persisted data
      if (persistedData?.cicdData?.providers?.length > 0) {
        log(
          `${LOG_PREFIX} Using persisted CICD data:`,
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
        return;
      }

      // Set loading state
      setState((prevState) => ({ ...prevState, loading: true, error: null }));

      try {
        // Get user from context using the getUserData helper
        const currentUser = getUserData();

        // Fetch CICD providers with user data from context
        const providersResponse = await getCICDProviders(currentUser);

        if (!providersResponse.success) {
          throw new Error(providersResponse.error || 'Failed to fetch CICD providers');
        }

        // Fetch CICD jobs if providers were retrieved successfully
        const jobsResponse = await getCICDJobs(currentUser);

        // Update state with fetched data
        setState((prevState) => ({
          ...prevState,
          providers: providersResponse.data || [],
          jobs: jobsResponse.success ? jobsResponse.data : [],
          loading: false,
          currentUser: currentUser || prevState.currentUser,
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
  }, [getUserData]);

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
    if (typeof persistedData !== 'undefined') {
      persistedData.cicdData = {
        providers: state.providers,
        jobs: state.jobs,
        loading: state.loading,
        error: state.error,
        // Include other state you want to persist
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
        return { success: false, error: 'Not fully implemented yet' };
      },
      getBuildStatus: async (buildId: string) => {
        console.error(`CICD: getBuildStatus not fully implemented yet for build ${buildId}`);
        return null;
      },
      getBuildLogs: async (buildId: string) => {
        console.error(`CICD: getBuildLogs not fully implemented yet for build ${buildId}`);
        return '';
      },

      // UI state management
      setSelectedProvider: (provider: CICDProviderType | null) =>
        setState((prev: CICDData) => ({ ...prev, selectedProvider: provider })),
      setSelectedJob: (job: CICDJob | null) =>
        setState((prev: CICDData) => ({ ...prev, selectedJob: job })),
      refreshUserData: fetchUserData,
    }),
    [
      state,
      fetchProviders,
      getProviderById,
      createProvider,
      updateProvider,
      deleteProvider,
      testProvider,
      fetchUserData,
    ],
  );

  // We're not using central context registration in the new architecture
  
  return <CICDContext.Provider value={contextValue}>{children}</CICDContext.Provider>;
};

// Export the hook for accessing the CICD context
export function useCICDContext() {
  const context = useContext(CICDContext);

  if (DEBUG) {
    console.log(`${LOG_PREFIX} useCICDContext called, returning:`, {
      isNull: context === null,
      hasProviders: context ? !!context.providers : false,
      providersCount: context?.providers?.length || 0,
    });
  }

  if (!context) {
    throw new Error(ERROR_MESSAGES.CONTEXT_USAGE);
  }

  return context;
}

// Export a hook with proper fallback values
export function useCICD() {
  try {
    return useCICDContext();
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in useCICD hook:`, error);

    // Return fallback object to prevent destructuring errors
    return {
      providers: [],
      jobs: [],
      builds: [],
      selectedProvider: null,
      selectedJob: null,
      loading: false,
      error: ERROR_MESSAGES.CONTEXT_USAGE,
      currentUser: null,

      // Actions with error fallbacks
      fetchProviders: async () => ({
        success: false,
        data: [],
        error: ERROR_MESSAGES.CONTEXT_USAGE,
      }),
      getProviderById: async () => null,
      createProvider: async () => ({ success: false, error: ERROR_MESSAGES.CONTEXT_USAGE }),
      updateProvider: async () => ({ success: false, error: ERROR_MESSAGES.CONTEXT_USAGE }),
      deleteProvider: async () => ({ success: false, error: ERROR_MESSAGES.CONTEXT_USAGE }),
      testProvider: async () => ({ success: false, error: ERROR_MESSAGES.CONTEXT_USAGE }),
      fetchJobs: async () => [],
      getJobById: async () => null,
      triggerJob: async () => ({ success: false, error: ERROR_MESSAGES.CONTEXT_USAGE }),
      getBuildStatus: async () => null,
      getBuildLogs: async () => '',
      fetchUserData: async () => null,

      // UI state management with empty functions
      setSelectedProvider: () => {},
      setSelectedJob: () => {},
      refreshUserData: async () => null,
    } as CICDContextType;
  }
}
