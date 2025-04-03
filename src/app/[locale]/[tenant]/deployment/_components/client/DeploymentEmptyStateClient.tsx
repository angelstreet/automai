'use client';

import { useDeployment } from './DeploymentProvider';
import { ClientEmptyState } from './ClientEmptyState';

export function DeploymentEmptyStateClient() {
  // Use the deployment provider context
  const { isLoading } = useDeployment('DeploymentEmptyStateClient');

  // If loading, show loading state
  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return <ClientEmptyState />;
}
