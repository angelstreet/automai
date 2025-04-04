'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define event constants here instead of importing from server action
export const REFRESH_HOSTS = 'REFRESH_HOSTS';
export const REFRESH_HOSTS_COMPLETE = 'REFRESH_HOSTS_COMPLETE';
export const OPEN_HOST_DIALOG = 'OPEN_HOST_DIALOG';
export const TOGGLE_HOST_VIEW_MODE = 'TOGGLE_HOST_VIEW_MODE';

export default function HostsEventListener() {
  const router = useRouter();

  useEffect(() => {
    const handleRefreshComplete = () => {
      // Refresh the route when events complete
      console.log('[@component:HostsEventListener] Refreshing route after Host operation');
      router.refresh();
    };

    const handleRefreshHosts = () => {
      console.log('[@component:HostsEventListener] Handling refresh hosts request');
      router.refresh();
    };

    const handleToggleViewMode = () => {
      console.log('[@component:HostsEventListener] Handling toggle view mode event');
      // Router refresh not needed for view mode toggle as it's client-side state
    };

    window.addEventListener(REFRESH_HOSTS_COMPLETE, handleRefreshComplete);
    window.addEventListener(REFRESH_HOSTS, handleRefreshHosts);
    window.addEventListener(TOGGLE_HOST_VIEW_MODE, handleToggleViewMode);

    return () => {
      window.removeEventListener(REFRESH_HOSTS_COMPLETE, handleRefreshComplete);
      window.removeEventListener(REFRESH_HOSTS, handleRefreshHosts);
      window.removeEventListener(TOGGLE_HOST_VIEW_MODE, handleToggleViewMode);
    };
  }, [router]);

  // This component renders nothing
  return null;
}
