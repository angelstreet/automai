import { getAllJobs as getDeployments } from '@/app/actions/jobsAction';
import { getRepositories } from '@/app/actions/repositoriesAction';

// Import with direct relative paths
import { DeploymentEmptyStateClient } from './client/DeploymentEmptyStateClient';
import { DeploymentListClient } from './client/DeploymentListClient';

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

    return <DeploymentEmptyStateClient errorMessage={deploymentsResponse.error} />;
  }

  // Otherwise, show the deployment list
  return (
    <DeploymentListClient initialDeployments={deployments} initialRepositories={repositories} />
  );
}
