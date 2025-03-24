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

  // Create InnerAppContext for cross-context communication
  const innerContextRef = useRef<AppContextType>({
    host: null,
    deployment: null,
    repository: null,
    cicd: null,
    user: null,
  });
  
  // Simple direct provider nesting with clear initialization order
  // UserProvider must be innermost since other contexts depend on it
  return (
    <InnerAppContext.Provider value={innerContextRef.current}>
      {/* Fixed order: User first (innermost), then the rest */}
      <UserProvider>
        <HostProvider>
          <RepositoryProvider>
            <DeploymentProvider>
              <CICDProvider>
                {children}
              </CICDProvider>
            </DeploymentProvider>
          </RepositoryProvider>
        </HostProvider>
      </UserProvider>
    </InnerAppContext.Provider>
  );
}

// No more complex bridge component - removed
// The InnerAppContext will be populated directly by each context as it initializes

// Inner context for the actual context values - exported for provider registration
export const InnerAppContext = createContext<AppContextType>({
  host: null,
  deployment: null,
  repository: null,
  cicd: null,
  user: null,
});

// Singleton-like initialization helpers
// Hook to use the app context (for consuming the values)
export function useAppContext() {
  const context = useContext(InnerAppContext);
  if (!context) {
    console.error('[AppContext] AppContext is undefined. Make sure to use AppProvider.');
    return {
      host: null,
      deployment: null,
      repository: null,
      cicd: null,
      user: null,
    };
  }
  return context;
}

// Simplified hooks with consistent error handling
export function useHost() {
  const context = useAppContext();
  
  if (!context.host) {
    // Only warn in development to avoid console spam
    if (DEBUG) {
      console.warn('[AppContext] Host context is not available yet. Make sure HostProvider is in the tree.');
    }
    
    // Return safe default
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
  
  return context.host;
}

export function useDeployment() {
  const context = useAppContext();
  
  if (!context.deployment) {
    if (DEBUG) {
      console.warn('[AppContext] Deployment context is not available yet.');
    }
    
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
  
  return context.deployment;
}

export function useRepository() {
  const context = useAppContext();
  
  if (!context.repository) {
    if (DEBUG) {
      console.warn('[AppContext] Repository context is not available yet.');
    }
    
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
  
  return context.repository;
}

export function useCICD() {
  const context = useAppContext();
  
  if (!context.cicd) {
    if (DEBUG) {
      console.warn('[AppContext] CICD context is not available yet.');
    }
    
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
  
  return context.cicd;
}

export function useUser() {
  const context = useAppContext();
  
  if (!context.user) {
    console.warn('[AppContext] User context is not available yet. This should not happen with proper provider ordering.');
    
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
  
  return context.user;
}
