'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Define constants in an object to avoid Fast Refresh issues
const DeploymentEvents = {
  // UI Control Events
  OPEN_DEPLOYMENT_DIALOG: 'OPEN_DEPLOYMENT_DIALOG', // Open the "Add Deployment" dialog

  // Data Refresh Events
  REFRESH_DEPLOYMENTS: 'REFRESH_DEPLOYMENTS', // Request to refresh deployment data from server

  // Workspace Events
  WORKSPACE_CHANGED: 'WORKSPACE_CHANGED', // Workspace changed, refresh deployments
  WORKSPACE_ITEM_ADDED: 'WORKSPACE_ITEM_ADDED', // Item added to workspace
  WORKSPACE_ITEM_REMOVED: 'WORKSPACE_ITEM_REMOVED', // Item removed from workspace
};

// Export the constants object
export { DeploymentEvents };

export default function DeploymentEventListener() {
  const router = useRouter();

  useEffect(() => {
    // Handle refresh deployments request
    const handleRefreshDeployments = () => {
      console.log(
        '[@component:DeploymentEventListener] REFRESH_DEPLOYMENTS: Refreshing deployments data',
      );
      router.refresh();
    };

    // Handle workspace change
    const handleWorkspaceChange = () => {
      console.log(
        '[@component:DeploymentEventListener] WORKSPACE_CHANGED: Refreshing deployments data',
      );
      router.refresh();
    };

    // Handle workspace item added event
    const handleWorkspaceItemAdded = (event: CustomEvent) => {
      if (event.detail?.itemType === 'deployment') {
        console.log(
          `[@component:DeploymentEventListener] Deployment ${event.detail.itemId} added to workspace`,
        );
        router.refresh();
      }
    };

    // Handle workspace item removed event
    const handleWorkspaceItemRemoved = (event: CustomEvent) => {
      if (event.detail?.itemType === 'deployment') {
        console.log(
          `[@component:DeploymentEventListener] Deployment ${event.detail.itemId} removed from workspace`,
        );
        router.refresh();
      }
    };

    // Debug message when component mounts
    console.log('[@component:DeploymentEventListener] Setting up event listeners');

    // Add event listeners
    window.addEventListener(DeploymentEvents.REFRESH_DEPLOYMENTS, handleRefreshDeployments);
    window.addEventListener(DeploymentEvents.WORKSPACE_CHANGED, handleWorkspaceChange);
    window.addEventListener(
      DeploymentEvents.WORKSPACE_ITEM_ADDED,
      handleWorkspaceItemAdded as EventListener,
    );
    window.addEventListener(
      DeploymentEvents.WORKSPACE_ITEM_REMOVED,
      handleWorkspaceItemRemoved as EventListener,
    );

    return () => {
      // Debug message when component unmounts
      console.log('[@component:DeploymentEventListener] Removing event listeners');

      // Remove event listeners
      window.removeEventListener(DeploymentEvents.REFRESH_DEPLOYMENTS, handleRefreshDeployments);
      window.removeEventListener(DeploymentEvents.WORKSPACE_CHANGED, handleWorkspaceChange);
      window.removeEventListener(
        DeploymentEvents.WORKSPACE_ITEM_ADDED,
        handleWorkspaceItemAdded as EventListener,
      );
      window.removeEventListener(
        DeploymentEvents.WORKSPACE_ITEM_REMOVED,
        handleWorkspaceItemRemoved as EventListener,
      );
    };
  }, [router]);

  // This component renders nothing
  return null;
}
