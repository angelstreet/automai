'use client';

import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { toast } from '@/components/shadcn/use-toast';
import { useDeployment } from '@/context';

interface DeploymentRunActionProps {
  deploymentId: string;
}

export const DeploymentRunAction: React.FC<DeploymentRunActionProps> = ({ 
  deploymentId 
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const { runDeployment } = useDeployment();
  
  const handleRun = async () => {
    setIsRunning(true);
    try {
      const result = await runDeployment(deploymentId);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Deployment run started successfully',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to run deployment',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Error running deployment:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
    }
  };
  
  return (
    <Button 
      onClick={handleRun}
      variant="outline"
      size="sm"
      disabled={isRunning}
      className="flex items-center text-xs"
    >
      {isRunning ? (
        <>
          <span className="animate-spin mr-1">⟳</span> Running...
        </>
      ) : (
        <>
          <PlayCircle className="mr-1 h-3 w-3" /> Run
        </>
      )}
    </Button>
  );
}; 