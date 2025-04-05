import { getDeployments } from '@/app/actions/deploymentsAction';
import { getRepositories } from '@/app/actions/repositoriesAction';

import DeploymentEventListener from './client/DeploymentEventListener';
import { DeploymentListClient } from './client/DeploymentListClient';

import { DeploymentEmptyStateClient } from '.';

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
      <>
        <DeploymentEventListener />
        <DeploymentEmptyStateClient
          errorMessage={deploymentsResponse.error}
          initialRepositories={repositories}
        />
      </>
    );
  }

  // Otherwise, show the deployment list
  return (
    <>
      <DeploymentEventListener />
      <DeploymentListClient initialDeployments={deployments} initialRepositories={repositories} />
    </>
  );
}
