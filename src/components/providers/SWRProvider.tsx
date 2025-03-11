'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Global configuration for SWR
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 5000, // 5 seconds between identical requests
      }}
    >
      {children}
    </SWRConfig>
  );
}
