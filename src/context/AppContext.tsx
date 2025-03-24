'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { HostProvider, useHostContext } from './HostContext';
import { DeploymentProvider, useDeployment as useDeploymentContext } from './DeploymentContext';
import { RepositoryProvider, useRepositoryContext } from './RepositoryContext';
import { CICDProvider, useCICDContext } from './CICDContext';
import { UserProvider, useUser as useUserContext } from './UserContext';
import { AppContextType } from '@/types/context/app';

// Reduce logging with a DEBUG flag
const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log(...args);

// Enable context persistence across page navigations
const PERSIST_CONTEXTS = true;

// Add a flag to track if initial contexts were loaded
let initialContextsLoaded = false;

// Global initialization tracking
export const globalInitStatus = {
  repository: false,
  deployment: false,
  host: false,
  cicd: false,

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
  scriptCache?: Record<string, any[]>;
} = {
  repositoryData: null,
  deploymentData: null,
  hostData: null,
  cicdData: null,
  userData: null,
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
  log('[AppContext] AppProvider initializing');

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
        log(`[AppContext] Initializing ${name} context on demand`);

        // Update both local state and global tracking
        setContextState((prev) => {
          const newState = { ...prev, [name]: true };
          if (PERSIST_CONTEXTS) {
            globalInitStatus[name] = true;
          }
          return newState;
        });
      }
    },
    [contextState],
  );

  // Initialize all core contexts by default
  useEffect(() => {
    // Check if we've already run the initialization using globalInitStatus
    const allInitialized =
      globalInitStatus.repository &&
      globalInitStatus.deployment &&
      globalInitStatus.host &&
      globalInitStatus.cicd;

    if (PERSIST_CONTEXTS && !allInitialized) {
      // Initialize contexts only once
      initContext('repository');
      initContext('deployment');
      initContext('host');
      initContext('cicd');

      log('[AppContext] Pre-initializing all contexts for persistence');
    }
  }, [initContext]);

  // Log when AppProvider mounts and unmounts
  useEffect(() => {
    log('[AppContext] AppProvider mounted, user context enabled');

    return () => {
      log('[AppContext] AppProvider unmounting');
    };
  }, []);

  // Create context value with state and init function
  const contextValue = { contextState, initContext };

  // Render nested providers based on which are initialized
  const renderWithProviders = (node: React.ReactNode): React.ReactNode => {
    let result = node;

    // Wrap with each provider that's initialized, innermost first
    if (contextState.cicd) {
      result = <CICDProvider>{result}</CICDProvider>;
    }

    if (contextState.repository) {
      result = <RepositoryProvider>{result}</RepositoryProvider>;
    }

    if (contextState.deployment) {
      result = <DeploymentProvider>{result}</DeploymentProvider>;
    }

    if (contextState.host) {
      result = <HostProvider>{result}</HostProvider>;
    }

    // Always include UserProvider since it's fundamental
    if (contextState.user) {
      result = <UserProvider>{result}</UserProvider>;
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
  const hostContext = contextState.host ? useHostContext() : null;
  const deploymentContext = contextState.deployment ? useDeploymentContext() : null;
  const repositoryContext = contextState.repository ? useRepositoryContext() : null;
  const cicdContext = contextState.cicd ? useCICDContext() : null;

  // Always attempt to get user context since it's fundamental
  const userContext = useUserContext();

  // Log detailed diagnostic info for contexts
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

    // Additional logging for user context issues
    if (!userContext) {
      console.error('[AppContext] User context is null, this will cause errors');
    } else if (!userContext.user && !userContext.loading) {
      console.warn('[AppContext] User context exists but user is null and not loading');
    }
  }, [userContext, hostContext, deploymentContext, repositoryContext, cicdContext]);

  // Combine contexts - use any to bypass type checking
  // This is a workaround for the TypeScript errors with context interfaces
  const appContextValue = {
    host: hostContext,
    deployment: deploymentContext,
    repository: repositoryContext,
    cicd: cicdContext,
    user: userContext,
  } as any; // Type assertion to bypass TypeScript errors

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

  // Use an effect for initializing context instead of doing it during render
  useEffect(() => {
    // Initialize this context if not already initialized
    if (!contextState[name]) {
      log(`[AppContext] Auto-initializing ${name} context`);
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

  // During initialization, context.host will be null
  // After rerender with the provider, it will have a value
  return context.host;
}

export function useDeployment() {
  // Use _ prefix to indicate intentionally unused variable
  const _isInitialized = useInitContext('deployment');
  const context = useAppContext();

  return context.deployment;
}

export function useRepository() {
  // Use _ prefix to indicate intentionally unused variable
  const _isInitialized = useInitContext('repository');
  const context = useAppContext();

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

  return context.cicd;
}

export function useUser() {
  // Use _ prefix to indicate intentionally unused variable
  const _isInitialized = useInitContext('user');
  const context = useAppContext();

  // Track if we've already logged the user data for this component
  const hasLoggedUserData = useRef(false);

  // Add more detailed logging for troubleshooting - only when DEBUG is true
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

  return context.user;
}
