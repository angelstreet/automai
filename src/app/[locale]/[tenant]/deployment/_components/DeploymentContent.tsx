import { getDeployments } from '@/app/actions/deployments';
import { getRepositories } from '@/app/actions/repositories';

import { DeploymentList } from './DeploymentList';
import { DeploymentEmptyStateClient } from './client/DeploymentEmptyStateClient';

export async function DeploymentContent() {
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
