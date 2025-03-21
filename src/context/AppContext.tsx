'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { HostProvider, useHostContext } from './HostContext';
import { DeploymentProvider, useDeploymentContext } from './DeploymentContext';
import { RepositoryProvider, useRepositoryContext } from './RepositoryContext';
import { CICDProvider, useCICDContext } from './CICDContext';
import { AppContextType } from '@/types/context/app';

// Debug tracking system
interface ContextCallTracker {
  [contextName: string]: {
    [methodName: string]: {
      callCount: number;
      lastCalledBy: string;
      lastCalledAt: Date;
    }
  }
}

const callTracker: ContextCallTracker = {};

// Function to track context method calls
function trackContextCall(contextName: string, methodName: string, componentName: string) {
  if (!callTracker[contextName]) {
    callTracker[contextName] = {};
  }
  if (!callTracker[contextName][methodName]) {
    callTracker[contextName][methodName] = {
      callCount: 0,
      lastCalledBy: '',
      lastCalledAt: new Date()
    };
  }
  
  callTracker[contextName][methodName].callCount++;
  callTracker[contextName][methodName].lastCalledBy = componentName;
  callTracker[contextName][methodName].lastCalledAt = new Date();
  
  console.log(`[Context Tracker] ${contextName}.${methodName} called by ${componentName} (total: ${callTracker[contextName][methodName].callCount})`);
}

// Create the app context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component that composes all other providers
export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Determine which contexts to initialize based on current route or explicit usage
  const [activeContexts, setActiveContexts] = useState({
    host: false,
    deployment: false,
    repository: false,
    cicd: false
  });
  
  // Call counters for debug tracking
  const initCountRef = useRef({
    host: 0,
    deployment: 0,
    repository: 0,
    cicd: 0
  });

  // Initialize contexts based on route
  useEffect(() => {
    const newActiveContexts = {
      // Always initialize all contexts to ensure they're available everywhere
      host: true,
      deployment: true,
      repository: true,
      cicd: true
    };
    
    // Log initializations
    Object.entries(newActiveContexts).forEach(([context, isActive]) => {
      if (isActive && !activeContexts[context as keyof typeof activeContexts]) {
        initCountRef.current[context as keyof typeof initCountRef.current]++;
        console.log(`[Context Tracker] Initializing ${context} context (route: ${pathname}, init #${initCountRef.current[context as keyof typeof initCountRef.current]})`);
      }
    });
    
    setActiveContexts(newActiveContexts);
  }, [pathname, activeContexts]);

  // Render providers based on active contexts
  // We use nested conditionals to avoid unnecessary re-renders
  const renderChildren = () => {
    return (
      <>
        {activeContexts.host ? (
          <HostProvider>
            {activeContexts.deployment ? (
              <DeploymentProvider>
                {activeContexts.repository ? (
                  <RepositoryProvider>
                    {activeContexts.cicd ? (
                      <CICDProvider>
                        <AppContextBridge>
                          {children}
                        </AppContextBridge>
                      </CICDProvider>
                    ) : (
                      <AppContextBridge>
                        {children}
                      </AppContextBridge>
                    )}
                  </RepositoryProvider>
                ) : activeContexts.cicd ? (
                  <CICDProvider>
                    <AppContextBridge>
                      {children}
                    </AppContextBridge>
                  </CICDProvider>
                ) : (
                  <AppContextBridge>
                    {children}
                  </AppContextBridge>
                )}
              </DeploymentProvider>
            ) : activeContexts.repository ? (
              <RepositoryProvider>
                {activeContexts.cicd ? (
                  <CICDProvider>
                    <AppContextBridge>
                      {children}
                    </AppContextBridge>
                  </CICDProvider>
                ) : (
                  <AppContextBridge>
                    {children}
                  </AppContextBridge>
                )}
              </RepositoryProvider>
            ) : activeContexts.cicd ? (
              <CICDProvider>
                <AppContextBridge>
                  {children}
                </AppContextBridge>
              </CICDProvider>
            ) : (
              <AppContextBridge>
                {children}
              </AppContextBridge>
            )}
          </HostProvider>
        ) : activeContexts.deployment ? (
          <DeploymentProvider>
            {activeContexts.repository ? (
              <RepositoryProvider>
                {activeContexts.cicd ? (
                  <CICDProvider>
                    <AppContextBridge>
                      {children}
                    </AppContextBridge>
                  </CICDProvider>
                ) : (
                  <AppContextBridge>
                    {children}
                  </AppContextBridge>
                )}
              </RepositoryProvider>
            ) : activeContexts.cicd ? (
              <CICDProvider>
                <AppContextBridge>
                  {children}
                </AppContextBridge>
              </CICDProvider>
            ) : (
              <AppContextBridge>
                {children}
              </AppContextBridge>
            )}
          </DeploymentProvider>
        ) : activeContexts.repository ? (
          <RepositoryProvider>
            {activeContexts.cicd ? (
              <CICDProvider>
                <AppContextBridge>
                  {children}
                </AppContextBridge>
              </CICDProvider>
            ) : (
              <AppContextBridge>
                {children}
              </AppContextBridge>
            )}
          </RepositoryProvider>
        ) : activeContexts.cicd ? (
          <CICDProvider>
            <AppContextBridge>
              {children}
            </AppContextBridge>
          </CICDProvider>
        ) : (
          children
        )}
      </>
    );
  };

  return renderChildren();
}

// Bridge component that collects all context values and provides them through AppContext
function AppContextBridge({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Function to wrap context methods with tracking
  const wrapWithTracking = <T extends Record<string, any>>(
    context: T,
    contextName: string
  ): T => {
    const wrappedContext = { ...context } as T;
    
    // Loop through the context's properties
    Object.keys(context).forEach(key => {
      const value = context[key];
      
      // Only wrap functions
      if (typeof value === 'function') {
        wrappedContext[key as keyof T] = ((...args: any[]) => {
          // Get calling component from stack trace or use pathname as fallback
          const stack = new Error().stack || '';
          const callerMatch = stack.match(/at\s+(.*?)\s+\(/);
          const caller = callerMatch ? callerMatch[1] : pathname || 'unknown';
          
          // Track the call
          trackContextCall(contextName, key, caller);
          
          // Call original method
          return value(...args);
        }) as T[keyof T];
      }
    });
    
    return wrappedContext;
  };
  
  // Get values from each context, with safety checks
  let hostContext;
  try {
    hostContext = useHostContext();
  } catch (e) {
    hostContext = null;
  }
  
  let deploymentContext;
  try {
    deploymentContext = useDeploymentContext();
  } catch (e) {
    deploymentContext = null;
  }
  
  let repositoryContext;
  try {
    repositoryContext = useRepositoryContext();
  } catch (e) {
    repositoryContext = null;
  }
  
  let cicdContext;
  try {
    cicdContext = useCICDContext();
  } catch (e) {
    cicdContext = null;
  }
  
  // Wrap each context's methods with tracking
  const trackedHostContext = hostContext ? wrapWithTracking(hostContext, 'host') : null;
  const trackedDeploymentContext = deploymentContext ? wrapWithTracking(deploymentContext, 'deployment') : null;
  const trackedRepositoryContext = repositoryContext ? wrapWithTracking(repositoryContext, 'repository') : null;
  const trackedCicdContext = cicdContext ? wrapWithTracking(cicdContext, 'cicd') : null;
  
  // Combine contexts
  const appContextValue: AppContextType = {
    host: trackedHostContext,
    deployment: trackedDeploymentContext,
    repository: trackedRepositoryContext,
    cicd: trackedCicdContext
  };
  
  return (
    <AppContext.Provider value={appContextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the app context with lazy initialization capabilities
export function useAppContext() {
  const context = useContext(AppContext);
  
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  
  return context;
}

// Convenience hooks to access individual contexts directly, with lazy initialization
export function useHost() {
  const context = useAppContext();
  
  // If host context isn't initialized but is being accessed, mark it for initialization
  if (!context.host) {
    console.log('[Context Tracker] Host context accessed but not initialized. Scheduling initialization.');
    // This would typically trigger initialization but for now just log
  }
  
  return context.host;
}

export function useDeployment() {
  const context = useAppContext();
  
  if (!context.deployment) {
    console.log('[Context Tracker] Deployment context accessed but not initialized. Scheduling initialization.');
  }
  
  return context.deployment;
}

export function useRepository() {
  const context = useAppContext();
  
  if (!context.repository) {
    console.log('[Context Tracker] Repository context accessed but not initialized. Scheduling initialization.');
  }
  
  return context.repository;
}

export function useCICD() {
  const context = useAppContext();
  
  if (!context.cicd) {
    console.log('[Context Tracker] CICD context accessed but not initialized. Scheduling initialization.');
  }
  
  return context.cicd;
} 