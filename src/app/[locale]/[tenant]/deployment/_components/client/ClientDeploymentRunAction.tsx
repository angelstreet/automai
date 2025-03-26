'use client';

import React, { useState } from 'react';
import { Button } from '@/components/shadcn/button';
import { PlayCircle } from 'lucide-react';
import { useToast } from '@/components/shadcn/use-toast';
import { startDeployment } from '@/app/actions/deploymentWizard';
import { Deployment } from '../../types';

interface ClientDeploymentRunActionProps {
  deployment: Deployment;
  onDeploymentStarted?: () => void;
}

export function ClientDeploymentRunAction({
  deployment,
  onDeploymentStarted,
}: ClientDeploymentRunActionProps) {
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();

  const handleStartDeployment = async () => {
    if (isStarting) return;

    setIsStarting(true);

    try {
      const result = await startDeployment(deployment.id);

      if (result.success) {
        toast({
          title: 'Deployment started',
          description: `Deployment ${deployment.name} has been started successfully.`,
        });

        // Call the callback if provided
        if (onDeploymentStarted) {
          onDeploymentStarted();
        }
      } else {
        toast({
          title: 'Failed to start deployment',
          description: result.error || 'An unknown error occurred',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Disable button if deployment is already running
  const isDisabled = deployment.status === 'running' || isStarting;

  return (
    <Button
      variant="default"
      size="sm"
      className="ml-auto"
      onClick={handleStartDeployment}
      disabled={isDisabled}
    >
      <PlayCircle className="mr-1 h-4 w-4" />
      {isStarting ? 'Starting...' : 'Run Deployment'}
    </Button>
  );
}
