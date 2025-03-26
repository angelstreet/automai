'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 120000, // 1 minute between identical requests
        errorRetryCount: 3,
        onError: (error) => {
          console.error('SWR Error:', error);
        },
        shouldRetryOnError: true,
        // Return undefined on error instead of throwing
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          // Only retry up to specified count
          if (retryCount >= (config.errorRetryCount || 3)) {
            console.warn(`Max retries reached for ${key}`);
            return;
          }
          
          // Exponential backoff
          const timeout = Math.min(1000 * 2 ** retryCount, 30000);
          setTimeout(() => revalidate({ retryCount }), timeout);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
