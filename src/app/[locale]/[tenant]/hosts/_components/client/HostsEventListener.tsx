'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import {
  REFRESH_HOSTS,
  REFRESH_HOSTS_COMPLETE,
  OPEN_HOST_DIALOG,
  TOGGLE_HOST_VIEW_MODE,
} from '@/app/[locale]/[tenant]/hosts/constants';

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
      // Do NOT refresh - this should be client-side only
      // View mode toggle is handled by React state and localStorage
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
