'use client';

import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { useRouter } from 'next/navigation';
import DeploymentWizardContainer from '../DeploymentWizardContainer';
import { useToast } from '@/components/shadcn/use-toast';

export function DeploymentActions() {
  const [wizardActive, setWizardActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Handle refreshing deployment data
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      // Simply refresh the route to get fresh data
      router.refresh();

      // Wait a bit for visual confirmation
      setTimeout(() => {
        setIsRefreshing(false);
      }, 800);
    } catch (error) {
      console.error('Error refreshing deployments:', error);
      setIsRefreshing(false);

      toast({
        title: 'Error',
        description: 'Failed to refresh deployments',
        variant: 'destructive',
      });
    }
  };

  // Handle deployment creation success
  const handleDeploymentCreated = () => {
    setWizardActive(false);

    toast({
      title: 'Success',
      description: 'Deployment has been created successfully',
    });

    // Refresh the data
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button onClick={() => setWizardActive(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Deployment
        </Button>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {wizardActive && (
        <DeploymentWizardContainer
          onCancel={() => setWizardActive(false)}
          onDeploymentCreated={handleDeploymentCreated}
        />
      )}
    </>
  );
}
