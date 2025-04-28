'use client';

import { Clock, Play, Eye, PlayCircle, Trash2, MoreHorizontal, Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { refreshDeployments } from '@/app/actions/deploymentsAction';
import { deleteJob, startJob } from '@/app/actions/jobsAction';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog';
import { Button } from '@/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { useToast } from '@/components/shadcn/use-toast';
import { getFormattedTime } from '@/lib/utils/deploymentUtils';
import { Deployment } from '@/types/component/deploymentComponentType';
import { Repository } from '@/types/component/repositoryComponentType';

import DeploymentStatusBadgeClient from './DeploymentStatusBadgeClient';
import { EditDeploymentDialogClient } from './EditDeploymentDialogClient';

interface JobDetailsListClientProps {
  deployments: Deployment[];
  repositories: Repository[];
  searchQuery: string;
  filterStatus: string;
  activeTab: string;
  sortBy: string;
}

export function JobDetailsListClient({
  deployments,
  repositories,
  searchQuery,
  filterStatus,
  activeTab,
  sortBy,
}: JobDetailsListClientProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [repositoriesMap, setRepositoriesMap] = useState<Record<string, Repository>>({});
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deploymentToEdit, setDeploymentToEdit] = useState<Deployment | null>(null);
  const [displayDeployments, setDisplayDeployments] = useState<Deployment[]>([]);

  useEffect(() => {
    if (repositories && repositories.length > 0) {
      const repoMap = repositories.reduce(
        (acc, repo) => {
          acc[repo.id] = repo;
          return acc;
        },
        {} as Record<string, Repository>,
      );
      setRepositoriesMap(repoMap);
    }
  }, [repositories]);

  const getRepositoryName = React.useCallback(
    (deployment: Deployment): string => {
      if (!deployment.repositoryId) return 'Unknown';
      const repo = repositoriesMap[deployment.repositoryId];
      return repo?.name || 'Unknown';
    },
    [repositoriesMap],
  );

  // Define filter and sort functions with proper dependencies
  const getFilteredDeployments = React.useCallback(() => {
    return deployments.filter((deployment) => {
      if (
        activeTab === 'scheduled' &&
        deployment.scheduleType !== 'now' &&
        deployment.scheduleType !== 'later' &&
        deployment.scheduleType !== 'cron'
      )
        return false;
      if (activeTab === 'pending' && deployment.status !== 'pending') return false;
      if (
        activeTab === 'active' &&
        deployment.status !== 'pending' &&
        deployment.status !== 'in_progress'
      )
        return false;
      if (
        activeTab === 'completed' &&
        deployment.status !== 'success' &&
        deployment.status !== 'failed'
      )
        return false;
      const repoName = getRepositoryName(deployment);
      const matchesSearch =
        searchQuery === '' ||
        deployment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repoName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || deployment.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [activeTab, deployments, filterStatus, getRepositoryName, searchQuery]);

  const getSortedDeployments = React.useCallback(() => {
    const filtered = getFilteredDeployments();
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      const dateA = new Date(a.startedAt || a.scheduledTime || a.createdAt).getTime();
      const dateB = new Date(b.startedAt || b.scheduledTime || b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [getFilteredDeployments, sortBy]);

  useEffect(() => {
    setDisplayDeployments(getSortedDeployments());
  }, [getSortedDeployments]);

  const handleViewDeployment = (deployment: Deployment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Get the locale and tenant from the URL
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const locale = segments[0] || 'en';
    const tenant = segments[1] || 'trial';

    // Navigate to the job runs page for this configuration with proper path
    router.push(`/${locale}/${tenant}/deployment/job-runs/${deployment.id}`);
  };

  const handleDeleteClick = (deployment: Deployment, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[JobDetailsListClient:handleDeleteClick] Selected deployment for deletion:', {
      id: deployment.id,
      name: deployment.name,
    });
    setSelectedDeployment(deployment);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeployment) {
      console.error(
        '[JobDetailsListClient:handleConfirmDelete] No deployment selected for deletion',
      );
      return;
    }

    console.log('[JobDetailsListClient:handleConfirmDelete] Confirming deletion of deployment:', {
      id: selectedDeployment.id,
      name: selectedDeployment.name,
    });

    try {
      // Save ID to a local variable to use in case of state updates
      const idToDelete = selectedDeployment.id;

      setActionInProgress(idToDelete);
      console.log(
        '[JobDetailsListClient:handleConfirmDelete] Calling deleteJob with ID:',
        idToDelete,
      );

      // Make sure we're calling the server action with a direct string argument
      const result = await deleteJob(String(idToDelete));
      console.log(
        '[JobDetailsListClient:handleConfirmDelete] Delete result:',
        JSON.stringify(result),
      );

      if (result && result.success) {
        console.log(
          '[JobDetailsListClient:handleConfirmDelete] Delete successful for ID:',
          idToDelete,
        );

        // Close the dialog first
        setIsDeleteDialogOpen(false);

        toast({
          title: 'Deployment Deleted',
          description: 'Successfully deleted.',
          variant: 'default',
        });

        // Use the server action to revalidate the deployment page
        await refreshDeployments();
      } else {
        console.error('[JobDetailsListClient:handleConfirmDelete] Delete failed:', {
          id: selectedDeployment.id,
          error: result?.error || 'Unknown error',
        });
        toast({
          title: 'Error',
          description: result?.error || 'Failed to delete',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('[JobDetailsListClient:handleConfirmDelete] Exception during delete:', {
        id: selectedDeployment?.id,
        error: error.message || 'Unknown error',
        stack: error.stack,
      });

      toast({
        title: 'Error',
        description: error.message || 'Unexpected error during deletion',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setActionInProgress(null);
    }
  };

  const handleRunDeployment = async (deployment: Deployment) => {
    if (isRunning === deployment.id) return;

    setIsRunning(deployment.id);
    try {
      // Get user ID for the job run
      const { getUser } = await import('@/app/actions/userAction');
      const user = await getUser();

      // Use a user ID if available, otherwise just use a placeholder
      const userId = user?.id || 'system';

      console.log('[JobDetailsListClient:handleRunDeployment] Queuing job with ID:', deployment.id);
      const result = await startJob(deployment.id, userId);
      console.log(
        '[JobDetailsListClient:handleRunDeployment] Queue result:',
        JSON.stringify(result),
      );

      if (result && result.success) {
        toast({
          title: 'Success',
          description: 'Deployment queued for execution',
          variant: 'default',
        });

        // Use the server action to revalidate the deployment page
        await refreshDeployments();
      } else {
        toast({
          title: 'Error',
          description: result?.error || 'Failed to queue deployment',
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
      setIsRunning(null);
    }
  };

  const handleEditClick = (deployment: Deployment, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[JobDetailsListClient:handleEditClick] Selected deployment for editing:', {
      id: deployment.id,
      name: deployment.name,
    });
    setDeploymentToEdit(deployment);
    setShowEditDialog(true);
  };

  if (displayDeployments.length === 0) {
    return (
      <div className="text-center py-8 bg-transparent dark:bg-transparent">
        <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4">
          {activeTab === 'scheduled' ? (
            <Clock className="h-12 w-12" />
          ) : activeTab === 'pending' ? (
            <Clock className="h-12 w-12" />
          ) : activeTab === 'active' ? (
            <Play className="h-12 w-12" />
          ) : activeTab === 'completed' ? (
            <Clock className="h-12 w-12" />
          ) : (
            <Clock className="h-12 w-12" />
          )}
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
          No deployments found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {searchQuery || filterStatus !== 'all'
            ? 'Try changing your search or filter criteria'
            : 'Create your first deployment to get started'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-transparent dark:bg-transparent">
            <tr>
              <th
                scope="col"
                className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Created
              </th>
              <th
                scope="col"
                className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Completed
              </th>
              <th
                scope="col"
                className="px-2 py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-transparent dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
            {displayDeployments.map((deployment) => (
              <tr
                key={deployment.id}
                className="hover:bg-gray-800/10 dark:hover:bg-gray-700/30 cursor-pointer"
                onClick={(e) => handleViewDeployment(deployment, e)}
              >
                <td className="px-2 py-1 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">{deployment.name}</div>
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  <DeploymentStatusBadgeClient status={deployment.status} />
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {getFormattedTime
                    ? getFormattedTime(deployment.createdAt)
                    : new Date(deployment.createdAt).toLocaleString()}
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {deployment.completedAt
                    ? getFormattedTime
                      ? getFormattedTime(deployment.completedAt)
                      : new Date(deployment.completedAt).toLocaleString()
                    : '-'}
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-sm">
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex items-center justify-center"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDeployment(deployment);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(deployment, e);
                          }}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunDeployment(deployment);
                          }}
                          disabled={isRunning === deployment.id}
                        >
                          <PlayCircle className="mr-2 h-4 w-4" />
                          {isRunning === deployment.id ? 'Running...' : 'Run'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(deployment, e);
                          }}
                          disabled={actionInProgress === deployment.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deployment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDeployment?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-end gap-2">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EditDeploymentDialogClient
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        deployment={deploymentToEdit}
      />
    </>
  );
}
