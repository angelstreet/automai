'use client';

import { Eye, Trash2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import React, { useState } from 'react';

import { deleteDeployment } from '@/app/actions/deploymentsAction';
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
import { Button } from '@/components/shadcn/button';
import { toast } from '@/components/shadcn/use-toast';

import { ClientDeploymentRunAction } from './client';
import { REFRESH_DEPLOYMENTS } from './client/DeploymentProvider';

interface DeploymentActionsProps {
  deploymentId: string;
  deploymentName?: string;
}

export const DeploymentActions: React.FC<DeploymentActionsProps> = ({
  deploymentId,
  deploymentName = 'this deployment',
}) => {
  const router = useRouter();
  const params = useParams();
  const { locale, tenant } = params;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      setIsDeleting(true);
      const result = await deleteDeployment(deploymentId);

      if (result.success) {
        toast({
          title: 'Deployment Deleted',
          description: 'The deployment has been successfully deleted.',
          variant: 'default',
        });

        // Dispatch refresh event
        window.dispatchEvent(new CustomEvent(REFRESH_DEPLOYMENTS));

        // Navigate back to deployments list
        router.push(`/${locale}/${tenant}/deployment`);
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
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
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

      <ClientDeploymentRunAction
        deployment={{ id: deploymentId }}
        onDeploymentStarted={() => {
          // Dispatch refresh event instead of router.refresh()
          window.dispatchEvent(new CustomEvent(REFRESH_DEPLOYMENTS));
        }}
      />

      <Button
        variant="outline"
        size="sm"
        className="flex items-center text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        onClick={handleDeleteClick}
        disabled={isDeleting}
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
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
