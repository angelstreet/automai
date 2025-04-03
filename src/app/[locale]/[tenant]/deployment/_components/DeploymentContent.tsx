import { getDeployments } from '@/app/actions/deploymentsAction';
import { getRepositories } from '@/app/actions/repositoriesAction';

import { DeploymentList } from './DeploymentList';
import { DeploymentEmptyStateClient } from './client/DeploymentEmptyStateClient';
import { DeploymentProvider } from './client/DeploymentProvider';

export async function DeploymentContent() {
  // Fetch data at the server level
  const deploymentsResponse = await getDeployments();
  const deployments = deploymentsResponse.success ? deploymentsResponse.data || [] : [];

  const repositoriesResult = await getRepositories();
  const repositories = repositoriesResult.success ? repositoriesResult.data || [] : [];

  // If no deployments, show empty state
  if (deployments.length === 0) {
    return (
      <DeploymentProvider
        initialDeployments={[]}
        initialRepositories={repositories}
        initialLoading={false}
      >
        <DeploymentEmptyStateClient />
      </DeploymentProvider>
    );
  }

  // Otherwise, show the deployment list wrapped in provider
  return (
    <DeploymentProvider
      initialDeployments={deployments}
      initialRepositories={repositories}
      initialLoading={false}
    >
      <DeploymentList deployments={deployments} repositories={repositories} />
    </DeploymentProvider>
  );
}
