'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Event constants for Rec feature
 */
export const RecEvents = {
  // UI Control Events
  OPEN_VNC_VIEWER: 'OPEN_VNC_VIEWER',
  CLOSE_VNC_VIEWER: 'CLOSE_VNC_VIEWER',

  // Data Refresh Events
  REFRESH_REC_HOSTS: 'REFRESH_REC_HOSTS',

  // VNC-specific Actions
  VNC_CONNECTION_SUCCESS: 'VNC_CONNECTION_SUCCESS',
  VNC_CONNECTION_FAILED: 'VNC_CONNECTION_FAILED',
};

/**
 * Event listener component for Rec feature
 * Handles events related to VNC viewer and rec functionality
 */
export function RecEventListener() {
  const router = useRouter();

  useEffect(() => {
    console.log('[@component:RecEventListener] Initializing event listeners');

    // Handler for opening VNC viewer
    const handleOpenVncViewer = (event: CustomEvent) => {
      const { hostId, locale, tenant } = event.detail;
      console.log(`[@component:RecEventListener] Opening VNC viewer for host: ${hostId}`);

      if (hostId && locale && tenant) {
        router.push(`/${locale}/${tenant}/rec/vnc-viewer/${hostId}`);
      } else {
        console.error('[@component:RecEventListener] Missing required parameters for VNC viewer');
      }
    };

    // Handler for closing VNC viewer
    const handleCloseVncViewer = () => {
      console.log('[@component:RecEventListener] Closing VNC viewer');
      router.back();
    };

    // Handler for refreshing rec hosts
    const handleRefreshRecHosts = () => {
      console.log('[@component:RecEventListener] Refreshing rec hosts');
      // This event would trigger a revalidation of data,
      // which would be handled by components that use the useRecHosts hook

      // Dispatch a hosts updated event to trigger refetch in useRecHosts
      window.dispatchEvent(new Event('HOSTS_UPDATED'));
    };

    // Handler for VNC connection success
    const handleVncConnectionSuccess = (event: CustomEvent) => {
      const { hostId } = event.detail;
      console.log(`[@component:RecEventListener] VNC connection successful for host: ${hostId}`);
      // This would be used for analytics or updating UI to reflect connection status
    };

    // Handler for VNC connection failure
    const handleVncConnectionFailed = (event: CustomEvent) => {
      const { hostId, error } = event.detail;
      console.log(
        `[@component:RecEventListener] VNC connection failed for host: ${hostId}, error: ${error}`,
      );
      // This would be used for showing error messages or updating UI to reflect connection status
    };

    // Register event listeners with TypeScript cast for CustomEvent
    window.addEventListener(RecEvents.OPEN_VNC_VIEWER, handleOpenVncViewer as EventListener);

    window.addEventListener(RecEvents.CLOSE_VNC_VIEWER, handleCloseVncViewer as EventListener);

    window.addEventListener(RecEvents.REFRESH_REC_HOSTS, handleRefreshRecHosts as EventListener);

    window.addEventListener(
      RecEvents.VNC_CONNECTION_SUCCESS,
      handleVncConnectionSuccess as EventListener,
    );

    window.addEventListener(
      RecEvents.VNC_CONNECTION_FAILED,
      handleVncConnectionFailed as EventListener,
    );

    // Cleanup function to remove event listeners when component unmounts
    return () => {
      console.log('[@component:RecEventListener] Cleaning up event listeners');

      window.removeEventListener(RecEvents.OPEN_VNC_VIEWER, handleOpenVncViewer as EventListener);

      window.removeEventListener(RecEvents.CLOSE_VNC_VIEWER, handleCloseVncViewer as EventListener);

      window.removeEventListener(
        RecEvents.REFRESH_REC_HOSTS,
        handleRefreshRecHosts as EventListener,
      );

      window.removeEventListener(
        RecEvents.VNC_CONNECTION_SUCCESS,
        handleVncConnectionSuccess as EventListener,
      );

      window.removeEventListener(
        RecEvents.VNC_CONNECTION_FAILED,
        handleVncConnectionFailed as EventListener,
      );
    };
  }, [router]);

  // This component doesn't render anything visible
  return null;
}
