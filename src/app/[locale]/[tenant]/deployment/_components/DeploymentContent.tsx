import { getDeployments } from '@/app/actions/deployments';
import { Plus } from 'lucide-react';
import { DeploymentList } from './DeploymentList';
import { Button } from '@/components/shadcn/button';

export async function DeploymentContent() {
  // Fetch deployments directly on the server
  const deployments = await getDeployments();
  
  // If no deployments, show empty state
  if (deployments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-lg border border-dashed">
        <div className="mb-4 p-4 rounded-full bg-muted/30">
          <Plus className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="mb-2 text-lg font-medium">No deployments found</p>
        <p className="text-muted-foreground mb-4">Create your first deployment to get started</p>
        <Button 
          className="inline-flex items-center"
          onClick={() => {}} // This will be handled by client-side component
        >
          <Plus className="h-4 w-4 mr-1" />
          New Deployment
        </Button>
      </div>
    );
  }
  
  // Otherwise, show the deployment list
  return (
    <DeploymentList deployments={deployments} />
  );
}