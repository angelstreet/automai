'use client';

import { Search, Clock, Play, Eye, PlayCircle, Trash2, MoreHorizontal, Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import {
  refreshDeployments,
  deleteJob,
  startJob,
  getJobRunsForConfig,
} from '@/app/actions/jobsAction';
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

import { ConfigDeploymentDialogClient } from './ConfigDeploymentDialogClient';
import { DeploymentActionsClient } from './DeploymentActionsClient';
import DeploymentStatusBadgeClient from './DeploymentStatusBadgeClient';
import { EditDeploymentDialogClient } from './EditDeploymentDialogClient';
import { JobRunOutputDialogClient } from './JobRunOutputDialogClient';

interface DeploymentListProps {
  initialDeployments: Deployment[];
  initialRepositories?: Repository[];
}

export function DeploymentListClient({
  initialDeployments = [],
  initialRepositories = [],
}: DeploymentListProps) {
  const { toast } = useToast();
  const router = useRouter();
  const c = useTranslations('common');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track initial loading state
  const [deployments, setDeployments] = useState<Deployment[]>(initialDeployments);
  const [repositoriesMap, setRepositoriesMap] = useState<Record<string, Repository>>({});
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deploymentToEdit, setDeploymentToEdit] = useState<Deployment | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedDeploymentForConfig, setSelectedDeploymentForConfig] = useState<Deployment | null>(
    null,
  );
  const [showOutputDialog, setShowOutputDialog] = useState(false);
  const [selectedJobRunForOutput, setSelectedJobRunForOutput] = useState<any | null>(null);

  // Setup auto-refresh every 10 seconds
  useEffect(() => {
    console.log('[DeploymentList] Setting up auto-refresh (10s interval)');

    // Define the refresh function
    const refreshData = async () => {
      if (isRefreshing) return; // Prevent multiple concurrent refreshes

      try {
        setIsRefreshing(true);
        console.log('[DeploymentList] Auto-refreshing deployments data...');

        // Call the server action to refresh deployments
        const result = await refreshDeployments();
        if (result?.success) {
          console.log('[DeploymentList] Auto-refresh successful');
          // The router.refresh() will happen inside refreshDeployments()
          // which will trigger a re-render with new props
        }
      } catch (error) {
        console.error('[DeploymentList] Auto-refresh error:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Set up the interval
    const intervalId = setInterval(refreshData, 30000); // 10 seconds

    // Clean up the interval when component unmounts
    return () => {
      console.log('[DeploymentList] Cleaning up auto-refresh interval');
      clearInterval(intervalId);
    };
  }, [isRefreshing]);

  // Update deployments when initialDeployments prop changes
  useEffect(() => {
    console.log('[DeploymentList] Updating deployments from new props', {
      count: initialDeployments.length,
    });
    setDeployments(initialDeployments);
  }, [initialDeployments]);

  // Set hasAttemptedLoad to true after initial load and track first-time load
  useEffect(() => {
    console.log('[DeploymentList] Loading state:', {
      isRefreshing,
      deployments: deployments.length,
      hasAttemptedLoad,
      isInitialLoad,
    });

    if (isInitialLoad && deployments.length > 0) {
      setIsInitialLoad(false);
      setHasAttemptedLoad(true);
    }
  }, [isRefreshing, deployments.length, hasAttemptedLoad, isInitialLoad]);

  useEffect(() => {
    if (initialRepositories && initialRepositories.length > 0) {
      const repoMap = initialRepositories.reduce(
        (acc, repo) => {
          acc[repo.id] = repo;
          return acc;
        },
        {} as Record<string, Repository>,
      );
      setRepositoriesMap(repoMap);
    }
  }, [initialRepositories]);

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

      // For date sorting, prioritize the most recent run:
      // First check completedAt (most recent run completion)
      // Then check startedAt (currently running jobs)
      // Then check scheduledTime (for scheduled jobs)
      // Finally fall back to createdAt (job creation time)
      const dateA = new Date(
        a.completedAt || a.startedAt || a.scheduledTime || a.createdAt,
      ).getTime();
      const dateB = new Date(
        b.completedAt || b.startedAt || b.scheduledTime || b.createdAt,
      ).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [getFilteredDeployments, sortBy]);

  const displayDeployments = React.useMemo(() => getSortedDeployments(), [getSortedDeployments]);

  const renderSkeletonRows = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <tr key={`skeleton-${index}`} className="animate-pulse">
          <td className="px-2 py-3 whitespace-nowrap">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </td>
          <td className="px-2 py-3 whitespace-nowrap">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </td>
          <td className="px-2 py-3 whitespace-nowrap">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </td>
          <td className="px-2 py-3 whitespace-nowrap">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </td>
          <td className="px-2 py-3 whitespace-nowrap">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
          </td>
        </tr>
      ));
  };

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
    console.log('[DeploymentListClient:handleDeleteClick] Selected deployment for deletion:', {
      id: deployment.id,
      name: deployment.name,
    });
    setSelectedDeployment(deployment);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeployment) {
      console.error(
        '[DeploymentListClient:handleConfirmDelete] No deployment selected for deletion',
      );
      return;
    }

    console.log('[DeploymentListClient:handleConfirmDelete] Confirming deletion of deployment:', {
      id: selectedDeployment.id,
      name: selectedDeployment.name,
    });

    try {
      // Save ID to a local variable to use in case of state updates
      const idToDelete = selectedDeployment.id;

      setActionInProgress(idToDelete);
      console.log(
        '[DeploymentListClient:handleConfirmDelete] Calling deleteJob with ID:',
        idToDelete,
      );

      // Make sure we're calling the server action with a direct string argument
      const result = await deleteJob(String(idToDelete));
      console.log(
        '[DeploymentListClient:handleConfirmDelete] Delete result:',
        JSON.stringify(result),
      );

      if (result && result.success) {
        console.log(
          '[DeploymentListClient:handleConfirmDelete] Delete successful for ID:',
          idToDelete,
        );

        // Close the dialog first
        setIsDeleteDialogOpen(false);

        toast({
          title: 'Deployment Deleted',
          description: 'Successfully deleted.',
          variant: 'default',
        });

        // Update the local state to remove the deleted deployment
        setDeployments((current) => current.filter((d) => d.id !== idToDelete));

        // Use the server action to revalidate the deployment page
        await refreshDeployments();
      } else {
        console.error('[DeploymentListClient:handleConfirmDelete] Delete failed:', {
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
      console.error('[DeploymentListClient:handleConfirmDelete] Exception during delete:', {
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

      console.log('[DeploymentListClient:handleRunDeployment] Queuing job with ID:', deployment.id);
      const result = await startJob(deployment.id, userId);
      console.log(
        '[DeploymentListClient:handleRunDeployment] Queue result:',
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
    console.log('[DeploymentListClient:handleEditClick] Selected deployment for editing:', {
      id: deployment.id,
      name: deployment.name,
    });
    setDeploymentToEdit(deployment);
    setShowEditDialog(true);
  };

  const handleConfigClick = (deployment: Deployment, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[DeploymentListClient:handleConfigClick] Selected deployment for config view:', {
      id: deployment.id,
      name: deployment.name,
    });
    setSelectedDeploymentForConfig(deployment);
    setShowConfigDialog(true);
  };

  const handleOutputClick = async (deployment: Deployment, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[DeploymentListClient:handleOutputClick] Selected deployment for output view:', {
      id: deployment.id,
      name: deployment.name,
    });
    try {
      const jobRunsResult = await getJobRunsForConfig(deployment.id);
      if (jobRunsResult.success && jobRunsResult.data && jobRunsResult.data.length > 0) {
        // Sort by createdAt descending to get the latest job run
        const latestJobRun = jobRunsResult.data.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0];
        setSelectedJobRunForOutput(latestJobRun);
        setShowOutputDialog(true);
      } else {
        toast({
          title: 'No Job Run Found',
          description: 'No job run data available for this deployment.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('[DeploymentListClient:handleOutputClick] Error fetching job run:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch job run data.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-full">
      <div className="hidden">
        <DeploymentActionsClient
          deploymentCount={deployments.length}
          repositories={initialRepositories}
        />
      </div>
      <div className="bg-transparent dark:bg-transparent rounded-lg border-0 shadow-none">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search deployments..."
                className="pl-10 pr-4 py-1.5 w-full text-muted-foreground border rounded-md bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="sortBy" className="text-sm text-gray-600 dark:text-gray-400">
                Sort by:
              </label>
              <select
                id="sortBy"
                className="pl-3 pr-10 py-1.5 text-muted-foreground border rounded-md bg-transparent"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
              </select>
              <label htmlFor="filterStatus" className="text-sm text-gray-600 dark:text-gray-400">
                Status:
              </label>
              <select
                id="filterStatus"
                className="pl-3 pr-10 py-1.5 text-muted-foreground border rounded-md bg-transparent"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="running">Running</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex -mb-px">
              <button
                className={`mr-1 py-1.5 px-3 text-sm font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>
              <button
                className={`mr-1 py-1.5 px-3 text-sm font-medium flex items-center ${activeTab === 'scheduled' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('scheduled')}
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Scheduled
              </button>
              <button
                className={`mr-1 py-1.5 px-3 text-sm font-medium flex items-center ${activeTab === 'pending' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('pending')}
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Pending
              </button>
              <button
                className={`mr-1 py-1.5 px-3 text-sm font-medium flex items-center ${activeTab === 'active' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('active')}
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Active
              </button>
              <button
                className={`mr-1 py-1.5 px-3 text-sm font-medium flex items-center ${activeTab === 'completed' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('completed')}
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Completed
              </button>
            </div>
          </div>
          {isInitialLoad ? (
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
                      Last Run
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
                  {renderSkeletonRows()}
                </tbody>
              </table>
            </div>
          ) : displayDeployments.length > 0 ? (
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
                      Last Run
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
                        <div className="text-sm text-gray-900 dark:text-white">
                          {deployment.name}
                        </div>
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
                          : deployment.startedAt
                            ? getFormattedTime
                              ? getFormattedTime(deployment.startedAt) + ' (Running)'
                              : new Date(deployment.startedAt).toLocaleString() + ' (Running)'
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
                                  handleRunDeployment(deployment);
                                }}
                                disabled={isRunning === deployment.id}
                              >
                                <PlayCircle className="mr-2 h-4 w-4" />
                                {isRunning === deployment.id ? 'Running...' : 'Run'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDeployment(deployment);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Runs
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfigClick(deployment, e);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                {c('view_config')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOutputClick(deployment, e);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Output
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(deployment, e);
                                }}
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                {c('edit')}
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
          ) : (
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
          )}
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
      </div>
      <EditDeploymentDialogClient
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        deployment={deploymentToEdit}
      />
      <ConfigDeploymentDialogClient
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        deployment={selectedDeploymentForConfig}
      />
      <JobRunOutputDialogClient
        open={showOutputDialog}
        onOpenChange={setShowOutputDialog}
        jobRun={selectedJobRunForOutput}
      />
    </div>
  );
}
