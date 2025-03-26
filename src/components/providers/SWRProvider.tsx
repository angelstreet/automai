'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 120000, // 2 minutes between identical requests
        errorRetryCount: 3,
        onError: (error, key) => {
          // Only log actual errors, not "no data" scenarios
          if (
            error.message &&
            !error.message.toLowerCase().includes('not found') &&
            !error.message.toLowerCase().includes('no results') &&
            !error.message.toLowerCase().includes('no records')
          ) {
            console.error(`SWR Error for ${key}:`, error);
          }
        },
        shouldRetryOnError: (error) => {
          // Don't retry for "no data" scenarios
          if (
            error.message &&
            (error.message.toLowerCase().includes('not found') ||
              error.message.toLowerCase().includes('no results') ||
              error.message.toLowerCase().includes('no records'))
          ) {
            return false;
          }
          return true;
        },
        // Return undefined on error instead of throwing
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          // Don't retry for "no data" scenarios
          if (
            error.message &&
            (error.message.toLowerCase().includes('not found') ||
              error.message.toLowerCase().includes('no results') ||
              error.message.toLowerCase().includes('no records'))
          ) {
            return;
          }

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
