'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true, // Enable revalidation on focus
        revalidateOnReconnect: true,
        dedupingInterval: 30000, // 30 seconds between identical requests (reduced from 60s)
        errorRetryCount: 3,
        errorRetryInterval: 2000, // 2 seconds between retries
        keepPreviousData: true, // Keep previous data to prevent UI flicker
        onError: (error) => {
          console.error('SWR Error:', error);
        },
        // Global retry handler for auth-related errors
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          // Don't retry on 404s
          if (error?.status === 404) return;
          
          // Use exponential backoff for retries
          const delay = Math.min(1000 * (2 ** retryCount), 30000);
          
          // Special handling for user context
          if (key === 'user-data') {
            console.log(`[SWR] Retrying user data fetch in ${delay/1000}s (attempt ${retryCount+1})`);
          }
          
          setTimeout(() => revalidate({ retryCount }), delay);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
