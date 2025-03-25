'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useRef,
  useEffect,
  useState,
  useMemo,
} from 'react';
import { HostProvider } from './HostContext';
import { DeploymentProvider } from './DeploymentContext';
import { RepositoryProvider } from './RepositoryContext';
import { CICDProvider } from './CICDContext';
import { UserProvider } from './UserContext';
import { AppContextType } from '@/types/context/app';
import { UserContextType } from '@/types/context/user';

// Debug mode
const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log(...args);

// Singleton flag to detect multiple instances
let APP_CONTEXT_INITIALIZED = false;

// Enable context persistence across page navigations
export const persistedData: {
  user?: any;
  repositories?: any[];
  hosts?: any[];
  deployments?: any[];
  [key: string]: any;
} = {
  user: null,
};

// Create the app context to hold all context references
export const AppContext = createContext<AppContextType>({
  host: null,
  deployment: null,
  repository: null,
  cicd: null,
  user: null,
});

// Provider component that composes all other providers
export function AppProvider({ children }: { children: ReactNode }) {
  // Create a mutable ref for direct context updates
  const appContextRef = useRef<AppContextType>({
    host: null,
    deployment: null,
    repository: null,
    cicd: null,
    user: null,
  });
  
  // Track authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Singleton check
  useEffect(() => {
    if (APP_CONTEXT_INITIALIZED) {
      console.error(
        '[AppContext] Multiple AppProvider instances detected! ' +
          'This will cause serious performance and state problems. ' +
          'Ensure AppProvider is used only once at the root of your application.',
      );
    } else {
      APP_CONTEXT_INITIALIZED = true;
      log('[AppContext] AppProvider initialized as singleton');
    }

    return () => {
      if (APP_CONTEXT_INITIALIZED) {
        APP_CONTEXT_INITIALIZED = false;
        log('[AppContext] AppProvider singleton instance unmounted');
      }
    };
  }, []);

  log('[AppContext] AppProvider initializing');

  // Update authentication state when user context changes
  const handleAuthUpdate = (authState: boolean) => {
    setIsAuthenticated(authState);
    log('[AppContext] Authentication state updated:', authState);
    
    // Mark as initialized after auth state is determined
    if (!isInitialized) {
      setIsInitialized(true);
    }
  };

  // Create a memoized value for the app context
  const contextValue = useMemo(() => appContextRef.current, []);

  // Render providers based on authentication state
  return (
    <AppContext.Provider value={contextValue}>
      <UserProvider appContextRef={appContextRef} onAuthChange={handleAuthUpdate}>
        {isAuthenticated === true ? (
          // Only render data-fetching providers when authenticated
          <HostProvider userData={null}>
            <RepositoryProvider>
              <DeploymentProvider>
                <CICDProvider>
                  {children}
                </CICDProvider>
              </DeploymentProvider>
            </RepositoryProvider>
          </HostProvider>
        ) : (
          // When not authenticated or still checking, only render children without other contexts
          children
        )}
      </UserProvider>
    </AppContext.Provider>
  );
}

// Unified hook for accessing the app context
export function useAppContext() {
  return useContext(AppContext);
}

// Enhanced hooks that use the central AppContext and check authentication
export function useUser() {
  // Get user from AppContext
  const appContext = useContext(AppContext);
  
  if (appContext?.user) {
    return appContext.user;
  }

  // Return a safe fallback with correct type
  return {
    user: null,
    loading: true,
    error: null,
    updateProfile: async () => {},
    refreshUser: async () => null,
    updateRole: async () => {},
    clearCache: async () => {},
    isInitialized: false,
  };
}

export function useHost() {
  // First check authentication via AppContext
  const appContext = useContext(AppContext);
  const isAuthenticated = !!appContext?.user?.user;
  
  if (!isAuthenticated) {
    // Return inactive version when not authenticated
    return {
      hosts: [],
      loading: false,
      error: null,
      fetchHosts: async () => {},
      createHost: async () => ({ success: false, error: 'Not authenticated' }),
      updateHost: async () => ({ success: false, error: 'Not authenticated' }),
      deleteHost: async () => ({ success: false, error: 'Not authenticated' }),
    };
  }

  if (appContext?.host) {
    return appContext.host;
  }

  // Safe fallback
  return {
    hosts: [],
    loading: true,
    error: null,
    fetchHosts: async () => {},
    createHost: async () => ({ success: false, error: 'Host context not available' }),
    updateHost: async () => ({ success: false, error: 'Host context not available' }),
    deleteHost: async () => ({ success: false, error: 'Host context not available' }),
  };
}

export function useRepository() {
  // First check authentication via AppContext
  const appContext = useContext(AppContext);
  const isAuthenticated = !!appContext?.user?.user;
  
  if (!isAuthenticated) {
    // Return inactive version when not authenticated
    return {
      repositories: [],
      starredRepositories: [],
      filteredRepositories: [],
      loading: false,
      error: null,
      refreshRepositories: async () => {},
      filterRepositories: () => {},
      toggleStarRepository: () => {},
    };
  }

  if (appContext?.repository) {
    return appContext.repository;
  }

  // Safe fallback
  return {
    repositories: [],
    starredRepositories: [],
    filteredRepositories: [],
    loading: true,
    error: null,
    refreshRepositories: async () => {},
    filterRepositories: () => {},
    toggleStarRepository: () => {},
  };
}

export function useDeployment() {
  // First check authentication via AppContext
  const appContext = useContext(AppContext);
  const isAuthenticated = !!appContext?.user?.user;
  
  if (!isAuthenticated) {
    // Return inactive version when not authenticated
    return {
      deployments: [],
      repositories: [],
      loading: false,
      error: null,
      isRefreshing: false,
      fetchDeployments: async () => {},
      fetchDeploymentById: async () => null,
      createDeployment: async () => ({ success: false, error: 'Not authenticated' }),
      abortDeployment: async () => ({ success: false, error: 'Not authenticated' }),
      refreshDeployment: async () => ({ success: false, error: 'Not authenticated' }),
      updateDeployment: async () => ({ success: false, error: 'Not authenticated' }),
      deleteDeployment: async () => ({ success: false, error: 'Not authenticated' }),
    };
  }

  if (appContext?.deployment) {
    return appContext.deployment;
  }

  // Safe fallback
  return {
    deployments: [],
    repositories: [],
    loading: true,
    error: null,
    isRefreshing: false,
    fetchDeployments: async () => {},
    fetchDeploymentById: async () => null,
    createDeployment: async () => ({ success: false, error: 'Deployment context not available' }),
    abortDeployment: async () => ({ success: false, error: 'Deployment context not available' }),
    refreshDeployment: async () => ({ success: false, error: 'Deployment context not available' }),
    updateDeployment: async () => ({ success: false, error: 'Deployment context not available' }),
    deleteDeployment: async () => ({ success: false, error: 'Deployment context not available' }),
  };
}

export function useCICD() {
  // First check authentication via AppContext
  const appContext = useContext(AppContext);
  const isAuthenticated = !!appContext?.user?.user;
  
  if (!isAuthenticated) {
    // Return inactive version when not authenticated
    return {
      providers: [],
      jobs: [],
      selectedProvider: null,
      selectedJob: null,
      loading: false,
      error: null,
      fetchProviders: async () => ({ success: false, data: [], error: 'Not authenticated' }),
      getProviderById: async () => null,
      createProvider: async () => ({ success: false, error: 'Not authenticated' }),
      updateProvider: async () => ({ success: false, error: 'Not authenticated' }),
      deleteProvider: async () => ({ success: false, error: 'Not authenticated' }),
      testProvider: async () => ({ success: false, error: 'Not authenticated' }),
      fetchJobs: async () => [],
      getJobById: async () => null,
      triggerJob: async () => ({ success: false, error: 'Not authenticated' }),
      getBuildStatus: async () => null,
      getBuildLogs: async () => '',
      fetchUserData: async () => null,
      setSelectedProvider: () => {},
      setSelectedJob: () => {},
      refreshUserData: async () => null,
    };
  }

  if (appContext?.cicd) {
    return appContext.cicd;
  }

  // Safe fallback
  return {
    providers: [],
    jobs: [],
    selectedProvider: null,
    selectedJob: null,
    loading: true,
    error: null,
    fetchProviders: async () => ({ success: false, data: [], error: 'CICD context not available' }),
    getProviderById: async () => null,
    createProvider: async () => ({ success: false, error: 'CICD context not available' }),
    updateProvider: async () => ({ success: false, error: 'CICD context not available' }),
    deleteProvider: async () => ({ success: false, error: 'CICD context not available' }),
    testProvider: async () => ({ success: false, error: 'CICD context not available' }),
    fetchJobs: async () => [],
    getJobById: async () => null,
    triggerJob: async () => ({ success: false, error: 'CICD context not available' }),
    getBuildStatus: async () => null,
    getBuildLogs: async () => '',
    fetchUserData: async () => null,
    setSelectedProvider: () => {},
    setSelectedJob: () => {},
    refreshUserData: async () => null,
  };
}
