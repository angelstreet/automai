'use client';

import { ClientDeploymentRunAction } from './ClientDeploymentRunAction';

export function DeploymentRunActionClient(
  props: React.ComponentProps<typeof ClientDeploymentRunAction>,
) {
  return <ClientDeploymentRunAction {...props} />;
}
