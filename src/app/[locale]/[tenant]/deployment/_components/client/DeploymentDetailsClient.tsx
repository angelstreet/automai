'use client';

import { ClientDeploymentDetails } from './ClientDeploymentDetails';

export function DeploymentDetailsClient(
  props: React.ComponentProps<typeof ClientDeploymentDetails>,
) {
  return <ClientDeploymentDetails {...props} />;
}
