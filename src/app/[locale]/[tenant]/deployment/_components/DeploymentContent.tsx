import { ReactNode } from 'react';
import { getDeployments } from '@/app/actions/deploymentsAction';
import { getRepositories } from '@/app/actions/repositoriesAction';
import { WithPageMetadata } from '@/components/layout/PageMetadata';

import { DeploymentList } from './DeploymentList';
import { DeploymentEmptyStateClient } from './client/DeploymentEmptyStateClient';

interface DeploymentContentProps extends WithPageMetadata {}

export async function DeploymentContent({ pageMetadata }: DeploymentContentProps = {}) {
  // Fetch deployments directly on the server
  const deployments = await getDeployments();

  // Also fetch repositories for display
  const repositoriesResult = await getRepositories();
  const repositories = repositoriesResult.success ? repositoriesResult.data || [] : [];

  // If no deployments, show empty state
  if (deployments.length === 0) {
    return <DeploymentEmptyStateClient />;
  }

  // Otherwise, show the deployment list
  return <DeploymentList deployments={deployments} repositories={repositories} />;
}
