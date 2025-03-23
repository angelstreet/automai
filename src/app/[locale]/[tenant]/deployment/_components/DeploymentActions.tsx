'use client';

import React, { useState } from 'react';
import { Button } from '@/components/shadcn/button';
import { Eye, Trash2, PlayCircle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { DeploymentRunAction } from './DeploymentRunAction';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/shadcn/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { toast } from '@/components/shadcn/use-toast';
import { useDeployment } from '@/context';

interface DeploymentActionsProps {
  deploymentId: string;
  deploymentName?: string;
}

export const DeploymentActions: React.FC<DeploymentActionsProps> = ({ 
  deploymentId, 
  deploymentName = 'this deployment'
}) => {
  const router = useRouter();
  const params = useParams();
  const { locale, tenant } = params;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const deploymentContext = useDeployment();
  
  const { 
    deleteDeployment = async () => ({ success: false, error: 'Deployment context not initialized' }) 
  } = deploymentContext || {};
  
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/${locale}/${tenant}/deployment/${deploymentId}`);
  };
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    try {
      const result = await deleteDeployment(deploymentId);
      
      if (result.success) {
        toast({
          title: 'Deployment Deleted',
          description: 'The deployment has been successfully deleted.',
          variant: 'default',
        });
        
        // Clear cache first to ensure we get fresh data
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('cached_deployment');
            localStorage.removeItem('cached_deployment_time');
          }
        } catch (e) {
          console.error('Error clearing localStorage:', e);
        }
        
        // Increase timeout and simplify flow to avoid race conditions
        setTimeout(() => {
          // Refresh and navigate in sequence rather than parallel
          router.refresh();
          router.push(`/${locale}/${tenant}/deployment`);
        }, 1000);
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
        onClick={handleDeleteClick}
      >
        <Trash2 className="mr-1 h-3 w-3" /> Delete
      </Button>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deployment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deploymentName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 