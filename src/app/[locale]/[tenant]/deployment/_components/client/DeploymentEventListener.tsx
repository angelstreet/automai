'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Define constants in an object to avoid Fast Refresh issues
const DeploymentEvents = {
  // UI Control Events
  OPEN_DEPLOYMENT_DIALOG: 'OPEN_DEPLOYMENT_DIALOG',

  // For refreshing the UI after mutation operations
  REFRESH_DEPLOYMENTS: 'REFRESH_DEPLOYMENTS',
};

// Export the constants object
export { DeploymentEvents };

// Event listener component to handle deployment events
export default function DeploymentEventListener() {
  const router = useRouter();

  // Create a listener effect for all events
  useEffect(() => {
    console.log('[@component:DeploymentEventListener] Setting up event listeners');

    const handleRefreshDeployments = () => {
      console.log('[@component:DeploymentEventListener] Refreshing deployments');
      router.refresh();
    };

    const handleOpenDialog = () => {
      console.log('[@component:DeploymentEventListener] Opening deployment dialog');

      // Dispatch an internal event that the dialog component will listen for
      // This allows components that manage dialogs to react to this event
      const dialogOpenEvent = new CustomEvent('INTERNAL_OPEN_DEPLOYMENT_DIALOG', {
        detail: { source: 'event-listener' },
      });
      window.dispatchEvent(dialogOpenEvent);
    };

    // Set up event listeners
    window.addEventListener(DeploymentEvents.REFRESH_DEPLOYMENTS, handleRefreshDeployments);
    window.addEventListener(DeploymentEvents.OPEN_DEPLOYMENT_DIALOG, handleOpenDialog);

    // Clean up event listeners
    return () => {
      window.removeEventListener(DeploymentEvents.REFRESH_DEPLOYMENTS, handleRefreshDeployments);
      window.removeEventListener(DeploymentEvents.OPEN_DEPLOYMENT_DIALOG, handleOpenDialog);
    };
  }, [router]);

  // This component renders nothing
  return null;
}
