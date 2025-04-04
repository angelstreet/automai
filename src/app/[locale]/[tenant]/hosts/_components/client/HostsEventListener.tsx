'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define event constants here instead of importing from server action
export const REFRESH_HOSTS = 'REFRESH_HOSTS';
export const REFRESH_HOSTS_COMPLETE = 'REFRESH_HOSTS_COMPLETE';
export const OPEN_HOST_DIALOG = 'OPEN_HOST_DIALOG';

export default function HostsEventListener() {
  const router = useRouter();

  useEffect(() => {
    const handleRefreshComplete = () => {
      // Refresh the route when events complete
      console.log('[@component:HostsEventListener] Refreshing route after Host operation');
      router.refresh();
    };

    window.addEventListener(REFRESH_HOSTS_COMPLETE, handleRefreshComplete);
    return () => {
      window.removeEventListener(REFRESH_HOSTS_COMPLETE, handleRefreshComplete);
    };
  }, [router]);

  // This component renders nothing
  return null;
}
