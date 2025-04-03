'use client';

import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
import { useToast } from '@/components/shadcn/use-toast';
import { PermissionAwareActionsWrapper } from '@/components/team/PermissionAwareActionsWrapper';
import { usePermission } from '@/hooks';
import { Deployment } from '@/types/component/deploymentComponentType';

import { deleteDeployment, executeDeployment } from '@/app/actions/deploymentsAction';
import { useDeployment } from './client/DeploymentProvider';
import { REFRESH_DEPLOYMENTS } from './client/DeploymentProvider';

interface DeploymentListProps {
  deployments: Deployment[];
  repositories: any[];
}

export function DeploymentList({
  deployments: initialDeployments,
  repositories,
}: DeploymentListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { deployments, isLoading } = useDeployment('DeploymentList');
  const { hasPermission } = usePermission();
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    async function checkCreatePermission() {
      const hasCreatePermission = await hasPermission('deployments', 'insert');
      setCanCreate(hasCreatePermission);
    }

    checkCreatePermission();
  }, [hasPermission]);

  const handleEdit = (deployment: Deployment) => {
    router.push(`/deployment/edit/${deployment.id}`);
  };

  const handleDelete = async (deployment: Deployment) => {
    try {
      const result = await deleteDeployment(deployment.id);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Deployment deleted successfully',
        });

        // Use custom event instead of direct state updates
        window.dispatchEvent(new CustomEvent(REFRESH_DEPLOYMENTS));
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete deployment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to delete deployment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete deployment',
        variant: 'destructive',
      });
    }
  };

  const handleExecute = async (deployment: Deployment) => {
    try {
      const result = await executeDeployment(deployment.id);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Deployment started successfully',
        });

        // Use custom event instead of direct API call
        window.dispatchEvent(new CustomEvent(REFRESH_DEPLOYMENTS));
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to start deployment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to execute deployment:', error);
      toast({
        title: 'Error',
        description: 'Failed to start deployment',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Deployments</h2>
        {canCreate && (
          <Button onClick={() => router.push('/deployment/create')}>Create Deployment</Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center">Loading deployments...</div>
      ) : deployments.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No deployments found.
          {canCreate && (
            <Button variant="link" onClick={() => router.push('/deployment/create')}>
              Create one
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell className="font-medium">{deployment.name}</TableCell>
                <TableCell>{deployment.status}</TableCell>
                <TableCell>
                  {deployment.createdAt
                    ? formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })
                    : 'Unknown'}
                </TableCell>
                <TableCell>
                  <PermissionAwareActionsWrapper
                    resourceType="deployments"
                    resourceId={deployment.id}
                    creatorId={deployment.creator_id}
                    onEdit={() => handleEdit(deployment)}
                    onDelete={() => handleDelete(deployment)}
                    onExecute={() => handleExecute(deployment)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
