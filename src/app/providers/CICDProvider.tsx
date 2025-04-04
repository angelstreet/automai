'use client';

import React, { useState, useEffect } from 'react';

import { getCICDProviders } from '@/app/actions/cicdAction';
import { CICDContext } from '@/context/CICDContext';
import type { CICDProvider as CICDProviderType } from '@/types/component/cicdComponentType';

// Event constants
export const REFRESH_CICD_PROVIDERS = 'refresh-cicd-providers';
export const REFRESH_CICD_COMPLETE = 'refresh-cicd-complete';
export const CICD_TESTING_CONNECTION = 'cicd-testing-connection';
export const CICD_TESTING_CONNECTION_COMPLETE = 'cicd-testing-connection-complete';

/**
 * CICDProvider manages the CI/CD providers state for the application
 * 
 * This component follows the architecture pattern:
 * - Only handles state, no business logic
 * - Pure data container
 * - Event-based refresh mechanism
 * 
 * Components should NOT use this provider directly but should
 * use the hook instead: import { useCICD } from '@/hooks/useCICD';
 */
export default function CICDProvider({
  children,
  initialProviders = [],
  initialLoading = false,
}: {
  children: React.ReactNode;
  initialProviders?: CICDProviderType[];
  initialLoading?: boolean;
}) {
  const [providers, setProviders] = useState<CICDProviderType[]>(initialProviders);
  const [isLoading, setIsLoading] = useState<boolean>(initialLoading);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = async () => {
      setIsLoading(true);

      try {
        const providersResponse = await getCICDProviders();
        const newProviders = providersResponse.success ? providersResponse.data || [] : [];
        setProviders(newProviders);

        // Dispatch event with the provider count
        window.dispatchEvent(
          new CustomEvent('provider-count-updated', {
            detail: { count: newProviders.length },
          }),
        );
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

  // Notify about provider count on initial mount
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('provider-count-updated', {
        detail: { count: initialProviders.length },
      }),
    );
  }, [initialProviders.length]);

  // Provide state container only, business logic in hooks/useCICD
  const value = {
    providers,
    isLoading,
  };

  return <CICDContext.Provider value={value}>{children}</CICDContext.Provider>;
}