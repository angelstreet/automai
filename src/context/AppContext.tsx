'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { HostProvider, useHostContext } from './host';
import { DeploymentProvider, useDeploymentContext } from './deployment';
import { RepositoryProvider, useRepositoryContext } from './repository';
import { CICDProvider, useCICDContext } from './cicd';
import { AppContextType } from '@/types/context/app';

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component that composes all other providers
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <HostProvider>
      <DeploymentProvider>
        <RepositoryProvider>
          <CICDProvider>
            <AppContextBridge>
              {children}
            </AppContextBridge>
          </CICDProvider>
        </RepositoryProvider>
      </DeploymentProvider>
    </HostProvider>
  );
}

// Bridge component that collects all context values and provides them through AppContext
function AppContextBridge({ children }: { children: ReactNode }) {
  // Get values from each context
  const hostContext = useHostContext();
  const deploymentContext = useDeploymentContext();
  const repositoryContext = useRepositoryContext();
  const cicdContext = useCICDContext();
  
  // Combine contexts
  const appContextValue: AppContextType = {
    host: hostContext,
    deployment: deploymentContext,
    repository: repositoryContext,
    cicd: cicdContext
  };
  
  return (
    <AppContext.Provider value={appContextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the app context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Convenience hooks to access individual contexts directly
export function useHost() {
  return useAppContext().host;
}

export function useDeployment() {
  return useAppContext().deployment;
}

export function useRepository() {
  return useAppContext().repository;
}

export function useCICD() {
  return useAppContext().cicd;
} 