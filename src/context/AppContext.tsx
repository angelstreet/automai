'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useRef,
  useEffect,
  useState,
} from 'react';
import { HostProvider, useHost as useDirectHostContext } from './HostContext';
import { DeploymentProvider, useDeployment as useDirectDeploymentContext } from './DeploymentContext';
import { RepositoryProvider, useRepository as useDirectRepositoryContext } from './RepositoryContext';
import { CICDProvider, useCICD as useDirectCICDContext } from './CICDContext';
import { UserProvider, useUser as useDirectUserContext } from './UserContext';
import { AppContextType } from '@/types/context/app';
import { UserContextType } from '@/types/context/user';

// Debug mode
const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log(...args);

// Global references for immediate access to context values
// This avoids the asynchronous nature of context initialization
let globalUserContext: UserContextType | null = null;

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
  };

  // Render only UserProvider initially, and only add other providers if authenticated
  return (
    <AppContext.Provider value={appContextRef.current}>
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
          // They will use the fallback values from the individual useXXX hooks
          children
        )}
      </UserProvider>
    </AppContext.Provider>
  );
}

// Compatibility hook for accessing all contexts at once (not recommended)
export function useAppContext() {
  return useContext(AppContext);
}

// Enhanced useUser hook that prioritizes immediate access through global ref
export function useUser() {
  // First try the global reference for immediate access
  if (globalUserContext) {
    return globalUserContext;
  }

  // Then try direct context
  try {
    const directContext = useDirectUserContext();
    if (directContext) {
      // Cache for future synchronous access
      globalUserContext = directContext;
      return directContext;
    }
  } catch (e) {
    // Ignore errors from direct context
  }

  // Finally, try app context
  const appContext = useContext(AppContext);
  if (appContext?.user) {
    // Cache for future synchronous access
    globalUserContext = appContext.user;
    return appContext.user;
  }

  // Return a safe fallback as last resort
  log('[AppContext] All useUser fallbacks failed, returning default');
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

// Simplified hooks with better fallbacks for other contexts
export function useHost() {
  // First check authentication status
  const userContext = useContext(UserContext);
  const isAuthenticated = !!userContext?.user;
  
  // If not authenticated, return a completely inactive version
  if (!isAuthenticated) {
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

  // Try direct context first
  try {
    const directContext = useDirectHostContext();
    if (directContext) return directContext;
  } catch (e) {
    // Ignore errors from direct context
  }

  // Then try app context
  const appContext = useContext(AppContext);
  if (appContext?.host) return appContext.host;

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
  // First check authentication status
  const userContext = useContext(UserContext);
  const isAuthenticated = !!userContext?.user;
  
  // If not authenticated, return a completely inactive version
  if (!isAuthenticated) {
    return {
      repositories: [],
      starredRepositories: [],
      filteredRepositories: [],
      loading: false,
      error: null,
      refreshRepositories: async () => {},
      filterRepositories: () => {},
      toggleStarRepository: () => {},
      fetchRepositories: async () => [],
      createRepository: async () => ({ success: false, error: 'Not authenticated' }),
      deleteRepository: async () => ({ success: false, error: 'Not authenticated' }),
    };
  }

  // Try direct context first
  try {
    const directContext = useDirectRepositoryContext();
    if (directContext) return directContext;
  } catch (e) {
    // Ignore errors from direct context
  }

  // Then try app context
  const appContext = useContext(AppContext);
  if (appContext?.repository) return appContext.repository;

  // Safe fallback
  return {
    repositories: [],
    starredRepositories: [],
    filteredRepositories: [],
    loading: true,
    error: null,
    fetchRepositories: async () => {},
    createRepository: async () => ({ success: false, error: 'Repository context not available' }),
    deleteRepository: async () => ({ success: false, error: 'Repository context not available' }),
    toggleStarRepository: async () => ({ success: false, error: 'Repository context not available' }),
  };
}

export function useDeployment() {
  // First check authentication status
  const userContext = useContext(UserContext);
  const isAuthenticated = !!userContext?.user;
  
  // If not authenticated, return a completely inactive version
  if (!isAuthenticated) {
    return {
      deployments: [],
      loading: false,
      error: null,
      fetchDeployments: async () => {},
      createDeployment: async () => ({ success: false, error: 'Not authenticated' }),
      updateDeployment: async () => ({ success: false, error: 'Not authenticated' }),
      deleteDeployment: async () => ({ success: false, error: 'Not authenticated' }),
    };
  }

  // Try direct context first
  try {
    const directContext = useDirectDeploymentContext();
    if (directContext) return directContext;
  } catch (e) {
    // Ignore errors from direct context
  }

  // Then try app context
  const appContext = useContext(AppContext);
  if (appContext?.deployment) return appContext.deployment;

  // Safe fallback
  return {
    deployments: [],
    loading: true,
    error: null,
    fetchDeployments: async () => {},
    createDeployment: async () => ({ success: false, error: 'Deployment context not available' }),
    updateDeployment: async () => ({ success: false, error: 'Deployment context not available' }),
    deleteDeployment: async () => ({ success: false, error: 'Deployment context not available' }),
  };
}

export function useCICD() {
  // First check authentication status
  const userContext = useContext(UserContext);
  const isAuthenticated = !!userContext?.user;
  
  // If not authenticated, return a completely inactive version
  if (!isAuthenticated) {
    return {
      providers: [],
      jobs: [],
      selectedProvider: null,
      selectedJob: null,
      loading: false,
      error: null,
      fetchProviders: async () => {},
      fetchJobs: async () => {},
      createProvider: async () => ({ success: false, error: 'Not authenticated' }),
      deleteProvider: async () => ({ success: false, error: 'Not authenticated' }),
    };
  }

  // Try direct context first
  try {
    const directContext = useDirectCICDContext();
    if (directContext) return directContext;
  } catch (e) {
    // Ignore errors from direct context
  }

  // Then try app context
  const appContext = useContext(AppContext);
  if (appContext?.cicd) return appContext.cicd;

  // Safe fallback
  return {
    providers: [],
    jobs: [],
    selectedProvider: null,
    selectedJob: null,
    loading: true,
    error: null,
    fetchProviders: async () => {},
    fetchJobs: async () => {},
    createProvider: async () => ({ success: false, error: 'CICD context not available' }),
    deleteProvider: async () => ({ success: false, error: 'CICD context not available' }),
  };
}
