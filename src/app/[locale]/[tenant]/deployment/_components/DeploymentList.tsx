'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Deployment } from '../types';
import { abortDeployment, deleteDeployment } from '@/app/actions/deployments';
import { useToast } from '@/components/shadcn/use-toast';

interface DeploymentListProps {
  deployments: Deployment[];
}

export function DeploymentList({ deployments }: DeploymentListProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Handle aborting a deployment
  const handleAbortDeployment = async (id: string) => {
    try {
      setActionInProgress(id);
      const result = await abortDeployment(id);
      
      if (result.success) {
        toast({
          title: 'Deployment aborted',
          description: 'The deployment has been successfully aborted.',
        });
        router.refresh(); // Refresh the page to get updated data
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to abort deployment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error aborting deployment:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle deleting a deployment
  const handleDeleteDeployment = async (id: string) => {
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this deployment? This action cannot be undone.')) {
      return;
    }
    
    try {
      setActionInProgress(id);
      const result = await deleteDeployment(id);
      
      if (result) {
        toast({
          title: 'Deployment deleted',
          description: 'The deployment has been successfully deleted.',
        });
        router.refresh(); // Refresh the page to get updated data
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete deployment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting deployment:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Get status badge class based on deployment status
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'running':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
      case 'aborted':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="rounded-md border">
      <div className="border-b p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="font-medium">Recent Deployments</div>
          <div className="text-sm text-muted-foreground">{deployments.length} deployments</div>
        </div>
      </div>
      
      {deployments.map((deployment) => (
        <div key={deployment.id} className="p-4 border-b last:border-0">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium">{deployment.name}</div>
              <div className="text-sm text-muted-foreground">
                Created: {formatDate(deployment.createdAt)}
              </div>
              <div className="mt-2">
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(deployment.status)}`}>
                  {deployment.status}
                </span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {/* Show abort button only for pending/running deployments */}
              {(deployment.status === 'pending' || deployment.status === 'running' || deployment.status === 'in_progress') && (
                <button
                  className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                  onClick={() => handleAbortDeployment(deployment.id)}
                  disabled={actionInProgress === deployment.id}
                >
                  {actionInProgress === deployment.id ? 'Aborting...' : 'Abort'}
                </button>
              )}
              
              <button
                className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                onClick={() => handleDeleteDeployment(deployment.id)}
                disabled={actionInProgress === deployment.id}
              >
                {actionInProgress === deployment.id ? 'Deleting...' : 'Delete'}
              </button>
              
              <button
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                onClick={() => {
                  // View deployment details (will be implemented separately)
                  router.push(`/deployment/${deployment.id}`);
                }}
              >
                View
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}