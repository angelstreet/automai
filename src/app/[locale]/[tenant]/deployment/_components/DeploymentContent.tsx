import { getDeployments } from '@/app/actions/deploymentsAction';
import { getRepositories } from '@/app/actions/repositoriesAction';
import { DeploymentProvider } from '@/app/providers/DeploymentProvider';

import { DeploymentEmptyStateClient, DeploymentList } from '.';

export async function DeploymentContent() {
  // Fetch data at the server level
  const deploymentsResponse = await getDeployments();
  const deployments = deploymentsResponse.success ? deploymentsResponse.data || [] : [];

  const repositoriesResult = await getRepositories();
  const repositories = repositoriesResult.success ? repositoriesResult.data || [] : [];

  // If deployments failed to load or no deployments found, show empty state
  if (!deploymentsResponse.success || deployments.length === 0) {
    if (!deploymentsResponse.success) {
      console.error('Error loading deployments:', deploymentsResponse.error);
    }

    return (
      <DeploymentProvider
        initialDeployments={[]}
        initialRepositories={repositories}
        initialLoading={false}
      >
        <DeploymentEmptyStateClient errorMessage={deploymentsResponse.error} />
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
      <DeploymentListClient deployments={deployments} repositories={repositories} />
    </DeploymentProvider>
  );
}
