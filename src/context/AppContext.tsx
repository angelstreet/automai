'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { HostProvider, useHost } from './HostContext';
import { DeploymentProvider, useDeployment } from './DeploymentContext';
import { RepositoryProvider, useRepository } from './RepositoryContext';
import { CICDProvider, useCICD } from './CICDContext';
import { UserProvider, useUser } from './UserContext';
import { AppContextType } from '@/types/context/app';
import { useRequestProtection } from '@/hooks/useRequestProtection';

// Reduce logging with a DEBUG flag
const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log(...args);

// Enable context persistence across page navigations
const PERSIST_CONTEXTS = true;

// Singleton flag to detect multiple instances
let APP_CONTEXT_INITIALIZED = false;

// Add a flag to track if initial contexts were loaded
let initialContextsLoaded = false;

// Global initialization tracking
export const globalInitStatus = {
  repository: false,
  deployment: false,
  host: false,
  cicd: false,
  user: false,

  // Helper method to check if a context is initialized
  isInitialized: function (contextType) {
    return this[contextType] === true;
  },

  // Helper method to mark a context as initialized
  markInitialized: function (contextType) {
    this[contextType] = true;
    console.log(`[AppContext] Marked ${contextType} context as initialized`);
  },
};

// Storage for data persistence between navigations - exported so it can be imported
// in other context files directly, rather than using the global scope
export const persistedData: {
  repository?: any;
  repositories?: any[];
  hosts?: any[];
  deployment?: any;
  deployments?: any[];
  user?: any;
  tenant?: any;
  cicd?: any;
  cicdData?: any;
  scriptCache?: Record<string, any[]>;
} = {
  repositoryData: null,
  deploymentData: null,
  hostData: null,
  cicdData: null,
  user: null,
};

// Create the app context
const AppContext = createContext<{
  contextState: AppContextState;
  initContext: (name: ContextName) => void;
}>({
  contextState: {
    host: false,
    deployment: false,
    repository: false,
    cicd: false,
    user: true, // User context is important and should be initialized by default
  },
  initContext: () => {},
});

// Track which contexts are initialized
type ContextName = 'host' | 'deployment' | 'repository' | 'cicd' | 'user';
type AppContextState = Record<ContextName, boolean>;

// Provider component that composes all other providers
export function AppProvider({ children }: { children: ReactNode }) {
  // Singleton check
  useEffect(() => {
    if (APP_CONTEXT_INITIALIZED) {
      console.error(
        '[AppContext] Multiple AppProvider instances detected! ' +
          'This will cause serious performance and state problems. ' +
          'Ensure AppProvider is used only once at the root of your application.',
      );

      // Add visible console warning in development
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        console.warn(
          '%c[CRITICAL ERROR] Multiple AppProvider instances detected!',
          'color: red; font-size: 16px; font-weight: bold;',
        );
      }
    } else {
      APP_CONTEXT_INITIALIZED = true;
      log('[AppContext] AppProvider initialized as singleton');
    }

    return () => {
      // Only reset if this instance set it to true
      if (APP_CONTEXT_INITIALIZED) {
        APP_CONTEXT_INITIALIZED = false;
        log('[AppContext] AppProvider singleton instance unmounted');
      }
    };
  }, []);

  log('[AppContext] AppProvider initializing');

  // Add request protection
  const { protectedFetch, safeUpdateState, renderCount } = useRequestProtection('AppContext');

  // Manage which contexts are initialized
  const [contextState, setContextState] = useState<AppContextState>(() => {
    // Use globally persisted initialization status if enabled
    if (PERSIST_CONTEXTS) {
      return { ...globalInitStatus };
    }

    // Otherwise use default initialization
    return {
      host: false,
      deployment: false,
      repository: false,
      cicd: false,
      user: true, // Initialize user context by default
    };
  });

  // Function to initialize a context on demand
  const initContext = useCallback(
    (name: ContextName) => {
      if (!contextState[name]) {
        log(`[AppContext] Initializing ${name} context on demand (render #${renderCount})`);

        // Use safe update to avoid unnecessary rerenders
        safeUpdateState(
          setContextState,
          contextState,
          { ...contextState, [name]: true },
          `contextState.${name}`,
        );

        // Update global tracking if persistence is enabled
        if (PERSIST_CONTEXTS) {
          globalInitStatus[name] = true;
        }
      }
    },
    [contextState, safeUpdateState, renderCount],
  );

  // Initialize all core contexts by default
  useEffect(() => {
    // Check if we've already run the initialization using globalInitStatus
    const allInitialized =
      globalInitStatus.repository &&
      globalInitStatus.deployment &&
      globalInitStatus.host &&
      globalInitStatus.cicd &&
      globalInitStatus.user;

    if (PERSIST_CONTEXTS && !allInitialized) {
      // Initialize contexts only once
      initContext('repository');
      initContext('deployment');
      initContext('host');
      initContext('cicd');
      initContext('user');

      log('[AppContext] Pre-initializing all contexts for persistence');
    }
  }, [initContext]);

  // Log when AppProvider mounts and unmounts
  useEffect(() => {
    log('[AppContext] AppProvider mounted, render #' + renderCount);

    return () => {
      log('[AppContext] AppProvider unmounting');
    };
  }, [renderCount]);

  // Create context value with state and init function - memoized to prevent unnecessary renders
  const contextValue = useMemo(() => ({ contextState, initContext }), [contextState, initContext]);

  // Render nested providers based on which are initialized
  const renderWithProviders = (node: React.ReactNode): React.ReactNode => {
    let result = node;

    // Wrap with each provider that's initialized
    // CORRECTED ORDER: Initialize UserProvider first (innermost),
    // then other providers in dependency order - user comes first since others depend on it

    // Always include UserProvider since it's fundamental
    if (contextState.user) {
      result = <UserProvider>{result}</UserProvider>;
    }

    if (contextState.host) {
      result = <HostProvider>{result}</HostProvider>;
    }
    
    if (contextState.cicd) {
      result = <CICDProvider>{result}</CICDProvider>;
    }

    if (contextState.repository) {
      result = <RepositoryProvider>{result}</RepositoryProvider>;
    }

    if (contextState.deployment) {
      result = <DeploymentProvider>{result}</DeploymentProvider>;
    }

    return result;
  };

  return (
    <AppContext.Provider value={contextValue}>
      {renderWithProviders(<AppContextBridge>{children}</AppContextBridge>)}
    </AppContext.Provider>
  );
}

// Bridge component that collects all context values
function AppContextBridge({ children }: { children: ReactNode }) {
  const { contextState } = useContext(AppContext);
  const mountCount = useRef(0);

  // Get values from each context, with safety checks
  const hostContext = contextState.host ? useHost() : null;
  const deploymentContext = contextState.deployment ? useDeployment() : null;
  const repositoryContext = contextState.repository ? useRepository() : null;
  const cicdContext = contextState.cicd ? useCICD() : null;

  // Always attempt to get user context since it's fundamental
  const userContext = useUser();

  // Log diagnostic info only on first mount or in debug mode
  useEffect(() => {
    mountCount.current++;

    if (mountCount.current === 1 || DEBUG) {
      console.log('[AppContext] Bridge component mounted', {
        mountCount: mountCount.current,
        availableContexts: {
          user: !!userContext,
          userHasData: userContext ? !!userContext.user : false,
          host: !!hostContext,
          deployment: !!deploymentContext,
          repository: !!repositoryContext,
          cicd: !!cicdContext,
        },
      });
    }

    // Warn about missing user context only if it's supposed to be initialized
    if (contextState.user && !userContext) {
      console.error('[AppContext] User context is null, this will cause errors');
    } else if (contextState.user && userContext && !userContext.user && !userContext.loading) {
      console.warn('[AppContext] User context exists but user is null and not loading');
    }
  }, [
    userContext,
    hostContext,
    deploymentContext,
    repositoryContext,
    cicdContext,
    contextState.user,
  ]);

  // Combine contexts - memoized to prevent unnecessary renders
  const appContextValue = useMemo(
    () => ({
      host: hostContext,
      deployment: deploymentContext,
      repository: repositoryContext,
      cicd: cicdContext,
      user: userContext,
    }),
    [hostContext, deploymentContext, repositoryContext, cicdContext, userContext],
  );

  return <InnerAppContext.Provider value={appContextValue}>{children}</InnerAppContext.Provider>;
}

// Inner context for the actual context values
const InnerAppContext = createContext<AppContextType>({
  host: null,
  deployment: null,
  repository: null,
  cicd: null,
  user: null,
});

// Singleton-like initialization helpers
function useInitContext(name: ContextName) {
  const { contextState, initContext } = useContext(AppContext);

  // Call count for debugging
  const callCount = useRef(0);
  callCount.current++;

  // Use an effect for initializing context instead of doing it during render
  useEffect(() => {
    // Initialize this context if not already initialized
    if (!contextState[name]) {
      log(`[AppContext] Auto-initializing ${name} context (call #${callCount.current})`);
      initContext(name);
    }
  }, [contextState, initContext, name]);

  return contextState[name];
}

// Hook to use the app context (for consuming the values)
export function useAppContext() {
  // Use type assertion to resolve TypeScript issues with interfaces from different modules
  return useContext(InnerAppContext) as AppContextType;
}

// Singleton-like hooks for each context
export function useHost() {
  // Use _ prefix to indicate intentionally unused variable
  const _isInitialized = useInitContext('host');
  const context = useAppContext();

  // Safety check for null context
  if (!context.host) {
    if (DEBUG) {
      console.warn('[AppContext] Host context is null, returning fallback.');
    }
    return {
      hosts: [],
      loading: false,
      error: null,
      fetchHosts: async () => {},
      createHost: async () => ({ success: false, error: 'Host context not available' }),
      updateHost: async () => ({ success: false, error: 'Host context not available' }),
      deleteHost: async () => ({ success: false, error: 'Host context not available' }),
    };
  }

  // During initialization, context.host will be null
  // After rerender with the provider, it will have a value
  return context.host;
}

export function useDeployment() {
  // Use _ prefix to indicate intentionally unused variable
  const _isInitialized = useInitContext('deployment');
  const context = useAppContext();

  // Safety check for null context
  if (!context.deployment) {
    if (DEBUG) {
      console.warn('[AppContext] Deployment context is null, returning fallback.');
    }
    return {
      deployments: [],
      loading: false,
      error: null,
      fetchDeployments: async () => {},
      createDeployment: async () => ({ success: false, error: 'Deployment context not available' }),
      updateDeployment: async () => ({ success: false, error: 'Deployment context not available' }),
      deleteDeployment: async () => ({ success: false, error: 'Deployment context not available' }),
    };
  }

  return context.deployment;
}

export function useRepository() {
  // Use _ prefix to indicate intentionally unused variable
  const _isInitialized = useInitContext('repository');
  const context = useAppContext();

  // Safety check for null context
  if (!context.repository) {
    if (DEBUG) {
      console.warn('[AppContext] Repository context is null, returning fallback.');
    }
    return {
      repositories: [],
      starredRepositories: [],
      filteredRepositories: [],
      loading: false,
      error: null,
      fetchRepositories: async () => {},
      createRepository: async () => ({ success: false, error: 'Repository context not available' }),
      deleteRepository: async () => ({ success: false, error: 'Repository context not available' }),
      toggleStarRepository: async () => ({ success: false, error: 'Repository context not available' }),
    };
  }

  return context.repository;
}

export function useCICD() {
  // Use _ prefix to indicate intentionally unused variable
  const _isInitialized = useInitContext('cicd');
  const context = useAppContext();

  // Debug log to help diagnose missing CICD data
  if (DEBUG) {
    console.log('[AppContext] useCICD hook called:', {
      contextNull: !context,
      cicdNull: !context.cicd,
      initiated: _isInitialized,
    });

    if (context.cicd) {
      console.log('[AppContext] CICD data available:', {
        providers: context.cicd.providers?.length || 0,
        loading: context.cicd.loading,
      });
    }
  }

  // Safety check for null context
  if (!context.cicd) {
    if (DEBUG) {
      console.warn('[AppContext] CICD context is null, returning fallback.');
    }
    return {
      providers: [],
      jobs: [],
      selectedProvider: null,
      selectedJob: null,
      loading: false,
      error: null,
      fetchProviders: async () => {},
      fetchJobs: async () => {},
      createProvider: async () => ({ success: false, error: 'CICD context not available' }),
      deleteProvider: async () => ({ success: false, error: 'CICD context not available' }),
    };
  }

  return context.cicd;
}

export function useUser() {
  // Use _ prefix to indicate intentionally unused variable
  const _isInitialized = useInitContext('user');
  const context = useAppContext();

  // Track if we've already logged the user data for this component
  const hasLoggedUserData = useRef(false);

  // Add diagnostic logging for troubleshooting - only when DEBUG is true
  if (typeof window !== 'undefined' && DEBUG) {
    if (!context.user) {
      log('[AppContext] useUser hook returned null user context');
    } else if (context.user.loading) {
      log('[AppContext] useUser hook: user context is loading');
    } else if (!context.user.user) {
      log('[AppContext] useUser hook: user context loaded but no user data found');
    } else {
      log('[AppContext] useUser hook: user loaded successfully', {
        id: context.user.user.id,
        tenant: context.user.user.tenant_name,
      });
    }
  }

  // Add just one useful log when the user is initially loaded - not on every call
  useEffect(() => {
    if (context.user?.user && !context.user.loading && !hasLoggedUserData.current) {
      // Only log this on first successful load if DEBUG is true
      if (DEBUG) {
        console.log('[AppContext] User data available:', {
          id: context.user.user.id,
          tenant: context.user.user.tenant_name,
        });
      }
      hasLoggedUserData.current = true;
    }
  }, [context.user?.user, context.user?.loading]);

  // If the context.user is null for some reason, return a safe default object
  // This prevents destructuring errors in components
  if (!context.user) {
    console.warn(
      '[AppContext] User context is null, returning fallback. This should not happen with proper provider ordering.'
    );
    return {
      user: null,
      loading: true,
      error: null,
      updateProfile: async () => {},
      refreshUser: async () => null,
      updateRole: async () => {},
      clearCache: async () => {},
    };
  }

  return context.user;
}
