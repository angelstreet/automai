'use client';

import { DeploymentActions } from './client/DeploymentActions';

interface DeploymentActionsClientProps {
  deploymentCount?: number;
}

export function DeploymentActionsClient({ deploymentCount = 0 }: DeploymentActionsClientProps) {
  return <DeploymentActions deploymentCount={deploymentCount} />;
}
