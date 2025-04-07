import { getDeploymentWizardData } from '@/app/actions/deploymentWizardAction';

import { DeploymentWizardMainClient } from '.';

interface DeploymentWizardContainerProps {
  onCancel: () => void;
  onDeploymentCreated?: () => void;
  explicitRepositories?: any[];
  isReady?: boolean;
}

export default async function DeploymentWizardContainer({
  onCancel,
  onDeploymentCreated,
  explicitRepositories,
  isReady = true,
}: DeploymentWizardContainerProps) {
  try {
    // Skip fetching if we're not ready or if explicit repositories are provided
    if (!isReady) {
      return (
        <div className="p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin mb-4 border-t-2 border-b-2 border-primary rounded-full mx-auto"></div>
            <p className="text-muted-foreground">Loading wizard...</p>
          </div>
        </div>
      );
    }

    // If explicit repositories were provided, use those directly
    if (explicitRepositories && explicitRepositories.length > 0) {
      return (
        <DeploymentWizardMainClient
          repositories={explicitRepositories}
          hosts={[]}
          cicdProviders={[]}
          onCancel={onCancel}
          onDeploymentCreated={onDeploymentCreated}
        />
      );
    }

    // Fetch all required data on the server
    const data = await getDeploymentWizardData();

    if (!data.success) {
      return (
        <div className="p-8 text-center">
          <div className="text-destructive mb-2">Error loading data</div>
          <p className="text-muted-foreground text-sm">
            {data.error || 'Failed to load required data'}
          </p>
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Close
          </button>
        </div>
      );
    }

    return (
      <DeploymentWizardMainClient
        repositories={data.repositories || []}
        hosts={data.hosts || []}
        cicdProviders={data.cicdProviders || []}
        onCancel={onCancel}
        onDeploymentCreated={onDeploymentCreated}
      />
    );
  } catch (error: any) {
    console.error('Error in DeploymentWizardContainer:', error);
    return (
      <div className="p-8 text-center">
        <div className="text-destructive mb-2">Error</div>
        <p className="text-muted-foreground text-sm">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
        >
          Close
        </button>
      </div>
    );
  }
}
