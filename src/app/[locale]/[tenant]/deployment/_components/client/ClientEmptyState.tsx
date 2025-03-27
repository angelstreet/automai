'use client';

import { Rocket, Plus } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { EmptyState } from '@/components/layout/EmptyState';

export function ClientEmptyState() {
  const handleNewDeployment = () => {
    // Dispatch custom event to be handled by the script in the parent page
    document.dispatchEvent(new CustomEvent('create-new-deployment'));
  };

  return (
    <div className="rounded-lg border">
      <EmptyState
        icon={<Rocket className="h-10 w-10" />}
        title="No deployments found"
        description="Create your first deployment to get started"
        action={
          <Button onClick={handleNewDeployment}>
            <Plus className="h-4 w-4 mr-2" />
            New Deployment
          </Button>
        }
      />
    </div>
  );
}
