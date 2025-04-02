import { getDeployments } from '@/app/actions/deploymentsAction';
import { getRepositories } from '@/app/actions/repositoriesAction';

import { DeploymentList } from './DeploymentList';
import { DeploymentEmptyStateClient } from './client/DeploymentEmptyStateClient';

export async function DeploymentContent() {
  const deployments = await getDeployments();
  const repositoriesResult = await getRepositories();
  const repositories = repositoriesResult.success ? repositoriesResult.data || [] : [];

  // If no deployments, show empty state
  if (deployments.length === 0) {
    return <DeploymentEmptyStateClient />;
  }

  // Otherwise, show the deployment list
  return <DeploymentList deployments={deployments} repositories={repositories} />;
}
