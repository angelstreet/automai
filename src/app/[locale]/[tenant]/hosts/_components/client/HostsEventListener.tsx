'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Define and export event constants
export const REFRESH_HOSTS = 'REFRESH_HOSTS';
export const REFRESH_HOSTS_COMPLETE = 'REFRESH_HOSTS_COMPLETE';
export const OPEN_HOST_DIALOG = 'OPEN_HOST_DIALOG';
export const TOGGLE_HOST_VIEW_MODE = 'TOGGLE_HOST_VIEW_MODE';
export const HOST_CONNECTION_TESTING = 'HOST_CONNECTION_TESTING';
export const HOST_CONNECTION_TESTED = 'HOST_CONNECTION_TESTED';
export const TEST_ALL_HOSTS_REQUESTED = 'TEST_ALL_HOSTS_REQUESTED';
export const TEST_ALL_HOSTS_COMPLETE = 'TEST_ALL_HOSTS_COMPLETE';

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
      // No need to do anything here as Zustand will automatically update subscribers
      // View mode toggle is handled by Zustand store
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
