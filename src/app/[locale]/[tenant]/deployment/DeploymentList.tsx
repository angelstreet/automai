import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { getDeployments, deleteDeployment, executeDeployment } from '@/app/actions/deployments';
import { PermissionAwareActionsWrapper } from '@/components/team/PermissionAwareActionsWrapper';
import { usePermission } from '@/context';

import { Deployment } from './types';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';

export default function DeploymentList() {
  const router = useRouter();
  const { toast } = useToast();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermission();
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    async function checkCreatePermission() {
      const hasCreatePermission = await hasPermission('deployments', 'insert');
      setCanCreate(hasCreatePermission);
    }

    checkCreatePermission();
  }, [hasPermission]);

  useEffect(() => {
    async function loadDeployments() {
      try {
        setLoading(true);
        const result = await getDeployments();

        if (result.success && result.data) {
          setDeployments(result.data);
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to load deployments',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to fetch deployments:', error);
        toast({
          title: 'Error',
          description: 'Failed to load deployments',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadDeployments();
  }, [toast]);

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
        setDeployments((prev) => prev.filter((d) => d.id !== deployment.id));
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
        // Refresh the deployment list to show the updated status
        const updatedResult = await getDeployments();
        if (updatedResult.success && updatedResult.data) {
          setDeployments(updatedResult.data);
        }
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

      {loading ? (
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
