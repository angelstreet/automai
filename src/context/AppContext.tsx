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
import { UserProvider, useUser as useDirectUserContext } from './UserContext';
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

// The minimal core provider - only includes UserProvider
export function CoreProvider({ children }: { children: ReactNode }) {
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
          'This will cause serious performance and state problems.'
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

  log('[AppContext] CoreProvider initializing');

  // Update authentication state when user context changes
  const handleAuthUpdate = (authState: boolean) => {
    setIsAuthenticated(authState);
    log('[AppContext] Authentication state updated:', authState);
  };

  // Create a memoized value for the app context
  const contextValue = useMemo(() => appContextRef.current, []);

  // Only provide the user context by default
  return (
    <AppContext.Provider value={contextValue}>
      <UserProvider appContextRef={appContextRef} onAuthChange={handleAuthUpdate}>
        {children}
      </UserProvider>
    </AppContext.Provider>
  );
}

// Import these lazily where needed
export const lazyImports = {
  HostProvider: React.lazy(() => import('./HostContext').then(mod => ({ default: mod.HostProvider }))),
  RepositoryProvider: React.lazy(() => import('./RepositoryContext').then(mod => ({ default: mod.RepositoryProvider }))),
  DeploymentProvider: React.lazy(() => import('./DeploymentContext').then(mod => ({ default: mod.DeploymentProvider }))),
  CICDProvider: React.lazy(() => import('./CICDContext').then(mod => ({ default: mod.CICDProvider }))),
};

// Context requirement flags
export interface ContextRequirements {
  host?: boolean;
  repository?: boolean;
  deployment?: boolean;
  cicd?: boolean;
}

// Create specialized providers for different page requirements
export function createContextProvider(requirements: ContextRequirements) {
  return function CustomContextProvider({ children }: { children: ReactNode }) {
    const { user } = useAppContext();
    const isAuthenticated = !!user?.user;
    
    // Only render required contexts when authenticated
    let content = <>{children}</>;
    
    if (isAuthenticated) {
      // Wrap the content with only the required providers
      if (requirements.cicd) {
        const CICDProvider = lazyImports.CICDProvider;
        content = <React.Suspense fallback={<div>Loading CICD...</div>}>
          <CICDProvider>{content}</CICDProvider>
        </React.Suspense>;
      }
      
      if (requirements.deployment) {
        const DeploymentProvider = lazyImports.DeploymentProvider;
        content = <React.Suspense fallback={<div>Loading Deployment...</div>}>
          <DeploymentProvider>{content}</DeploymentProvider>
        </React.Suspense>;
      }
      
      if (requirements.repository) {
        const RepositoryProvider = lazyImports.RepositoryProvider;
        content = <React.Suspense fallback={<div>Loading Repository...</div>}>
          <RepositoryProvider>{content}</RepositoryProvider>
        </React.Suspense>;
      }
      
      if (requirements.host) {
        const HostProvider = lazyImports.HostProvider;
        content = <React.Suspense fallback={<div>Loading Host...</div>}>
          <HostProvider userData={null}>{content}</HostProvider>
        </React.Suspense>;
      }
    }
    
    return content;
  };
}

// Pre-built context providers for common scenarios
export const HostContextProvider = createContextProvider({ host: true });
export const RepositoryContextProvider = createContextProvider({ repository: true });
export const DeploymentContextProvider = createContextProvider({ deployment: true, repository: true });
export const CICDContextProvider = createContextProvider({ cicd: true });
export const FullContextProvider = createContextProvider({ host: true, repository: true, deployment: true, cicd: true });

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

// The other hooks are imported and used only when the relevant context is available
export { useHost } from './HostContext';
export { useRepository } from './RepositoryContext';
export { useDeployment } from './DeploymentContext';
export { useCICD } from './CICDContext';
