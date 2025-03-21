'use client';

import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { HostProvider, useHostContext } from './HostContext';
import { DeploymentProvider, useDeploymentContext } from './DeploymentContext';
import { RepositoryProvider, useRepositoryContext } from './RepositoryContext';
import { CICDProvider, useCICDContext } from './CICDContext';
import { UserProvider, useUser as useUserContext } from './UserContext';
import { AppContextType } from '@/types/context/app';

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
    user: true // User context is important and should be initialized by default
  },
  initContext: () => {}
});

// Track which contexts are initialized
type ContextName = 'host' | 'deployment' | 'repository' | 'cicd' | 'user';
type AppContextState = Record<ContextName, boolean>;

// Provider component that composes all other providers
export function AppProvider({ children }: { children: ReactNode }) {
  console.log('[AppContext] AppProvider initializing');
  
  // Manage which contexts are initialized
  const [contextState, setContextState] = useState<AppContextState>({
    host: false,
    deployment: false,
    repository: false,
    cicd: false,
    user: true // Initialize user context by default
  });
  
  // Function to initialize a context on demand
  const initContext = useCallback((name: ContextName) => {
    if (!contextState[name]) {
      console.log(`[AppContext] Initializing ${name} context on demand`);
      setContextState(prev => ({ ...prev, [name]: true }));
    }
  }, [contextState]);
  
  // Log when AppProvider mounts and unmounts
  useEffect(() => {
    console.log('[AppContext] AppProvider mounted, user context enabled');
    
    return () => {
      console.log('[AppContext] AppProvider unmounting');
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
      {renderWithProviders(
        <AppContextBridge>
          {children}
        </AppContextBridge>
      )}
    </AppContext.Provider>
  );
}

// Bridge component that collects all context values
function AppContextBridge({ children }: { children: ReactNode }) {
  const { contextState } = useContext(AppContext);
  
  // Get values from each context, with safety checks
  const hostContext = contextState.host ? useHostContext() : null;
  const deploymentContext = contextState.deployment ? useDeploymentContext() : null;
  const repositoryContext = contextState.repository ? useRepositoryContext() : null;
  const cicdContext = contextState.cicd ? useCICDContext() : null;
  const userContext = contextState.user ? useUserContext() : null;
  
  useEffect(() => {
    console.log('[AppContext] Bridge component mounted', {
      availableContexts: {
        user: !!userContext,
        userHasData: userContext ? !!userContext.user : false,
        host: !!hostContext,
        deployment: !!deploymentContext,
        repository: !!repositoryContext,
        cicd: !!cicdContext
      }
    });
    
    // Additional logging for debug
    if (userContext) {
      console.log('[AppContext] User context details', {
        userPresent: !!userContext.user,
        loading: userContext.loading,
        hasError: !!userContext.error
      });
    }
  }, [userContext, hostContext, deploymentContext, repositoryContext, cicdContext]);
  
  // Combine contexts - use any to bypass type checking
  // This is a workaround for the TypeScript errors with context interfaces
  const appContextValue = {
    host: hostContext,
    deployment: deploymentContext,
    repository: repositoryContext,
    cicd: cicdContext,
    user: userContext
  } as any; // Type assertion to bypass TypeScript errors
  
  return (
    <InnerAppContext.Provider value={appContextValue}>
      {children}
    </InnerAppContext.Provider>
  );
}

// Inner context for the actual context values
const InnerAppContext = createContext<AppContextType>({
  host: null,
  deployment: null,
  repository: null,
  cicd: null,
  user: null
});

// Singleton-like initialization helpers
function useInitContext(name: ContextName) {
  const { contextState, initContext } = useContext(AppContext);
  
  // Use an effect for initializing context instead of doing it during render
  useEffect(() => {
    // Initialize this context if not already initialized
    if (!contextState[name]) {
      console.log(`[AppContext] Auto-initializing ${name} context`);
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
  
  return context.cicd;
}

export function useUser() {
  // Use _ prefix to indicate intentionally unused variable
  const _isInitialized = useInitContext('user');
  const context = useAppContext();
  
  // Add more detailed logging for troubleshooting
  if (typeof window !== 'undefined') {
    if (!context.user) {
      console.log('[AppContext] useUser hook returned null user context');
    } else if (context.user.loading) {
      console.log('[AppContext] useUser hook: user context is loading');
    } else if (!context.user.user) {
      console.log('[AppContext] useUser hook: user context loaded but no user data found');
    } else {
      console.log('[AppContext] useUser hook: user loaded successfully', { 
        id: context.user.user.id,
        tenant: context.user.user.tenant_name
      });
    }
  }
  
  return context.user;
} 