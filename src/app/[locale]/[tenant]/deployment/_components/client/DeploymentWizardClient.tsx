'use client';

import ClientDeploymentWizard from './ClientDeploymentWizard';

export function DeploymentWizardClient(props: React.ComponentProps<typeof ClientDeploymentWizard>) {
  return <ClientDeploymentWizard {...props} />;
}
