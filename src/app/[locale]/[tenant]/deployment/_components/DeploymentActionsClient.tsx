'use client';

import { DeploymentActions } from './client/DeploymentActions';

export function DeploymentActionsClient(props: React.ComponentProps<typeof DeploymentActions>) {
  return <DeploymentActions {...props} />;
}
