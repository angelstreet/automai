'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { getCICDProviders } from '@/app/actions/cicdAction';

// Event constants
export const REFRESH_CICD_PROVIDERS = 'refresh-cicd-providers';
export const REFRESH_CICD_COMPLETE = 'refresh-cicd-complete';

interface CICDProviderProps {
  children: ReactNode;
  initialProviders: any[];
  initialLoading?: boolean;
}

interface CICDContextType {
  providers: any[];
  isLoading: boolean;
}

const CICDContext = createContext<CICDContextType | null>(null);

export function CICDProvider({
  children,
  initialProviders,
  initialLoading = false,
}: CICDProviderProps) {
  const [providers, setProviders] = useState(initialProviders);
  const [isLoading, setIsLoading] = useState(initialLoading);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = async (event: Event) => {
      console.log('[CICDProvider] Refresh event received');

      setIsLoading(true);

      try {
        // Similar to getHosts in HostContent
        const providersResponse = await getCICDProviders();
        const newProviders = providersResponse.success ? providersResponse.data || [] : [];

        console.log(`[CICDProvider] Fetched ${newProviders.length} providers`);
        setProviders(newProviders);
      } catch (error) {
        console.error('[CICDProvider] Error fetching providers:', error);
      } finally {
        setIsLoading(false);
        // Dispatch completion event
        window.dispatchEvent(new CustomEvent(REFRESH_CICD_COMPLETE));
      }
    };

    window.addEventListener(REFRESH_CICD_PROVIDERS, handleRefresh);
    return () => window.removeEventListener(REFRESH_CICD_PROVIDERS, handleRefresh);
  }, []);

  // Context value
  const value = {
    providers,
    isLoading,
  };

  return <CICDContext.Provider value={value}>{children}</CICDContext.Provider>;
}

export function useCICD(componentName = 'unknown') {
  const context = useContext(CICDContext);

  if (!context) {
    console.error(`[useCICD] Hook used outside of CICDProvider in ${componentName}`);
    throw new Error('useCICD must be used within a CICDProvider');
  }

  return context;
}
