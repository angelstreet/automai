'use client';

import React from 'react';
import { Button } from '@/components/shadcn/button';
import { Eye, Trash2, PlayCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DeploymentRunAction } from './DeploymentRunAction';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { toast } from '@/components/shadcn/use-toast';
import { deleteDeployment } from '../actions';

interface DeploymentActionsProps {
  deploymentId: string;
}

export const DeploymentActions: React.FC<DeploymentActionsProps> = ({ deploymentId }) => {
  const router = useRouter();
  
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/deployment/${deploymentId}`);
  };
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this deployment? This action cannot be undone.')) {
      try {
        const result = await deleteDeployment(deploymentId);
        
        if (result.success) {
          toast({
            title: 'Deployment Deleted',
            description: 'The deployment has been successfully deleted.',
            variant: 'default',
          });
          
          // Refresh the page to update the list
          router.refresh();
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to delete the deployment',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    }
  };
  
  return (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center text-xs"
        onClick={handleView}
      >
        <Eye className="mr-1 h-3 w-3" /> View
      </Button>
      
      <DeploymentRunAction deploymentId={deploymentId} />
      
      <Button
        variant="outline"
        size="sm"
        className="flex items-center text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        onClick={handleDelete}
      >
        <Trash2 className="mr-1 h-3 w-3" /> Delete
      </Button>
    </div>
  );
}; 