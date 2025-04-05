'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Define event constants here instead of importing from server action
export const REFRESH_CICD_PROVIDERS = 'REFRESH_CICD_PROVIDERS';
export const REFRESH_CICD_COMPLETE = 'REFRESH_CICD_COMPLETE';
export const OPEN_CICD_DIALOG = 'OPEN_CICD_DIALOG';
export const CICD_TESTING_CONNECTION = 'CICD_TESTING_CONNECTION';
export const CICD_TESTING_CONNECTION_COMPLETE = 'CICD_TESTING_CONNECTION_COMPLETE';

export default function CICDEventListener() {
  const router = useRouter();

  useEffect(() => {
    const handleRefreshComplete = () => {
      // Refresh the route when events complete
      console.log('[@component:CICDEventListener] Refreshing route after CICD operation');
      router.refresh();
    };

    window.addEventListener(REFRESH_CICD_COMPLETE, handleRefreshComplete);
    return () => {
      window.removeEventListener(REFRESH_CICD_COMPLETE, handleRefreshComplete);
    };
  }, [router]);

  // This component renders nothing
  return null;
}
