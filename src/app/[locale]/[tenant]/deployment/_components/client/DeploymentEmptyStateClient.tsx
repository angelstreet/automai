'use client';

import { ClientEmptyState } from './ClientEmptyState';

interface DeploymentEmptyStateClientProps {
  errorMessage?: string;
}

export function DeploymentEmptyStateClient({ errorMessage }: DeploymentEmptyStateClientProps) {
  return <ClientEmptyState errorMessage={errorMessage} />;
}
