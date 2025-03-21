'use client';

import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { HostProvider, useHostContext } from './HostContext';
import { DeploymentProvider, useDeploymentContext } from './DeploymentContext';
import { RepositoryProvider, useRepositoryContext } from './RepositoryContext';
import { CICDProvider, useCICDContext } from './CICDContext';
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
    cicd: false
  },
  initContext: () => {}
});

// Track which contexts are initialized
type ContextName = 'host' | 'deployment' | 'repository' | 'cicd';
type AppContextState = Record<ContextName, boolean>;

// Provider component that composes all other providers
export function AppProvider({ children }: { children: ReactNode }) {
  // Manage which contexts are initialized
  const [contextState, setContextState] = useState<AppContextState>({
    host: false,
    deployment: false,
    repository: false,
    cicd: false
  });
  
  // Function to initialize a context on demand
  const initContext = useCallback((name: ContextName) => {
    if (!contextState[name]) {
      console.log(`[Context] Initializing ${name} context on demand`);
      setContextState(prev => ({ ...prev, [name]: true }));
    }
  }, [contextState]);
  
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
  
  // Combine contexts
  const appContextValue: AppContextType = {
    host: hostContext,
    deployment: deploymentContext,
    repository: repositoryContext,
    cicd: cicdContext
  };
  
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
  cicd: null
});

// Singleton-like initialization helpers
function useInitContext(name: ContextName) {
  const { contextState, initContext } = useContext(AppContext);
  
  // Initialize this context if not already initialized
  if (!contextState[name]) {
    initContext(name);
  }
  
  return contextState[name];
}

// Hook to use the app context (for consuming the values)
export function useAppContext() {
  return useContext(InnerAppContext);
}

// Singleton-like hooks for each context
export function useHost() {
  const isInitialized = useInitContext('host');
  const context = useAppContext();
  
  // During initialization, context.host will be null
  // After rerender with the provider, it will have a value
  return context.host;
}

export function useDeployment() {
  const isInitialized = useInitContext('deployment');
  const context = useAppContext();
  
  return context.deployment;
}

export function useRepository() {
  const isInitialized = useInitContext('repository');
  const context = useAppContext();
  
  return context.repository;
}

export function useCICD() {
  const isInitialized = useInitContext('cicd');
  const context = useAppContext();
  
  return context.cicd;
} 