import { getDeployments } from '@/app/actions/deployments';
import { DeploymentList } from './DeploymentList';
import { ClientEmptyState } from './client/ClientEmptyState';

export async function DeploymentContent() {
  // Fetch deployments directly on the server
  const deployments = await getDeployments();
  
  // If no deployments, show empty state
  if (deployments.length === 0) {
    return <ClientEmptyState />;
  }
  
  // Otherwise, show the deployment list
  return (
    <DeploymentList deployments={deployments} />
  );
}