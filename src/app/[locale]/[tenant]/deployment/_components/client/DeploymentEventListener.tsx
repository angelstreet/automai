'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const DeploymentEvents = {
  REFRESH_DEPLOYMENTS: 'REFRESH_DEPLOYMENTS',
  OPEN_DEPLOYMENT_DIALOG: 'OPEN_DEPLOYMENT_DIALOG',
  // Other deployment-related events can be added here
};

export default function DeploymentEventListener() {
  const router = useRouter();

  useEffect(() => {
    const handleRefresh = () => {
      console.log('[@component:DeploymentEventListener] Refreshing route after deployment update');
      router.refresh();
    };

    window.addEventListener(DeploymentEvents.REFRESH_DEPLOYMENTS, handleRefresh);

    return () => {
      window.removeEventListener(DeploymentEvents.REFRESH_DEPLOYMENTS, handleRefresh);
    };
  }, [router]);

  // This component renders nothing
  return null;
}
