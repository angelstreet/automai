'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Define constants in an object to avoid Fast Refresh issues
const DeploymentEvents = {
  // UI Control Events
  OPEN_DEPLOYMENT_DIALOG: 'OPEN_DEPLOYMENT_DIALOG',
};

// Export the constants object
export { DeploymentEvents };

// Event listener component to handle deployment events
export default function DeploymentEventListener() {
  const router = useRouter();

  // Create a listener effect for all events
  useEffect(() => {
    console.log('[@component:DeploymentEventListener] Setting up event listeners');

    // We no longer need to listen for refresh events since we're using Next.js revalidation
    // The component is kept for backward compatibility and for handling other events

    // Clean up event listeners
    return () => {
      // No listeners to clean up
    };
  }, [router]);

  // This component renders nothing
  return null;
}
