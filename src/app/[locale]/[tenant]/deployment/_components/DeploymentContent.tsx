import { getRepositories } from '@/app/actions/repositoriesAction';

// Import with direct relative paths
import { DeploymentContentClient } from './client/DeploymentContentClient';
import { DeploymentEmptyStateClient } from './client/DeploymentEmptyStateClient';
import { DeploymentFooterClient } from './client/DeploymentFooterClient';

interface DeploymentContentProps {
  initialDeployments: any[];
  user: any;
}

export async function DeploymentContent({ initialDeployments, user }: DeploymentContentProps) {
  // Use the deployments passed from the parent component
  const deployments = initialDeployments || [];

  // Fetch repositories and pass the user to avoid redundant API calls
  const repositoriesResult = await getRepositories({}, user);
  const repositories = repositoriesResult.success ? repositoriesResult.data || [] : [];

  // If no deployments found, show empty state
  if (deployments.length === 0) {
    return <DeploymentEmptyStateClient errorMessage="" />;
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-grow">
        <DeploymentContentClient
          initialDeployments={deployments}
          initialRepositories={repositories}
        />
      </div>
      <DeploymentFooterClient />
    </div>
  );
}
