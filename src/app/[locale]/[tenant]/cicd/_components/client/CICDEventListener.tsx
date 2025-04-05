'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Define constants in an object to avoid Fast Refresh issues
const CICDEvents = {
  // UI Control Events
  OPEN_CICD_DIALOG: 'OPEN_CICD_DIALOG',

  // Data Refresh Events
  REFRESH_CICD_COMPLETE: 'REFRESH_CICD_COMPLETE',

  // Connection Testing Events
  CICD_TESTING_CONNECTION: 'CICD_TESTING_CONNECTION',
  CICD_TESTING_CONNECTION_COMPLETE: 'CICD_TESTING_CONNECTION_COMPLETE',
};

// Export the constants object
export { CICDEvents };

export default function CICDEventListener() {
  const router = useRouter();

  useEffect(() => {
    const handleRefreshComplete = () => {
      // Refresh the route when events complete
      console.log('[@component:CICDEventListener] Refreshing route after CICD operation');
      router.refresh();
    };

    window.addEventListener(CICDEvents.REFRESH_CICD_COMPLETE, handleRefreshComplete);
    return () => {
      window.removeEventListener(CICDEvents.REFRESH_CICD_COMPLETE, handleRefreshComplete);
    };
  }, [router]);

  // This component renders nothing
  return null;
}
