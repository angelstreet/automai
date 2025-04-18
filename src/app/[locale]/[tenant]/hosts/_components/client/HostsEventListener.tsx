'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Define constants in an object to avoid Fast Refresh issues
const HostsEvents = {
  // UI Control Events
  OPEN_HOST_DIALOG: 'OPEN_HOST_DIALOG', // Open the "Add Host" dialog
  TOGGLE_HOST_VIEW_MODE: 'TOGGLE_HOST_VIEW_MODE', // Switch between grid/table view

  // Data Refresh Events
  REFRESH_HOSTS: 'REFRESH_HOSTS', // Request to refresh host data from server
  TEST_ALL_HOSTS: 'TEST_ALL_HOSTS', // Request to test all hosts

  // Host Testing Events
  HOST_TESTING_START: 'HOST_TESTING_START', // Single host testing starts
  HOST_TESTING_COMPLETE: 'HOST_TESTING_COMPLETE', // Single host testing completes
};

// Export the constants object
export { HostsEvents };

export default function HostsEventListener() {
  const router = useRouter();

  useEffect(() => {
    // Handle refresh hosts request
    const handleRefreshHosts = () => {
      console.log('[@component:HostsEventListener] REFRESH_HOSTS: Refreshing hosts data');
      router.refresh();
    };

    // Handle individual host testing events
    const handleHostTestingStart = (event: CustomEvent) => {
      if (event.detail?.hostId) {
        console.log(
          `[@component:HostsEventListener] HOST_TESTING_START: Host ${event.detail.hostId}`,
        );
      }
    };

    const handleHostTestingComplete = (event: CustomEvent) => {
      if (event.detail?.hostId) {
        console.log(
          `[@component:HostsEventListener] HOST_TESTING_COMPLETE: Host ${event.detail.hostId}`,
        );
      }
    };

    // Debug message when component mounts
    console.log('[@component:HostsEventListener] Setting up event listeners');

    // Add event listeners
    window.addEventListener(HostsEvents.REFRESH_HOSTS, handleRefreshHosts);
    window.addEventListener(
      HostsEvents.HOST_TESTING_START,
      handleHostTestingStart as EventListener,
    );
    window.addEventListener(
      HostsEvents.HOST_TESTING_COMPLETE,
      handleHostTestingComplete as EventListener,
    );

    return () => {
      // Debug message when component unmounts
      console.log('[@component:HostsEventListener] Removing event listeners');

      // Remove event listeners
      window.removeEventListener(HostsEvents.REFRESH_HOSTS, handleRefreshHosts);
      window.removeEventListener(
        HostsEvents.HOST_TESTING_START,
        handleHostTestingStart as EventListener,
      );
      window.removeEventListener(
        HostsEvents.HOST_TESTING_COMPLETE,
        handleHostTestingComplete as EventListener,
      );
    };
  }, [router]);

  // This component renders nothing
  return null;
}
