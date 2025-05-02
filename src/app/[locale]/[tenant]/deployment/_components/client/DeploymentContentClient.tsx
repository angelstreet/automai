'use client';

import { Search, Clock, Play } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { refreshDeployments } from '@/app/actions/jobsAction';
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
import { useToast } from '@/components/shadcn/use-toast';
import { Deployment } from '@/types/component/deploymentComponentType';
import { Repository } from '@/types/component/repositoryComponentType';

import { ConfigDeploymentDialogClient } from './ConfigDeploymentDialogClient';
import { DeploymentActionsClient } from './DeploymentActionsClient';
import { DeploymentTableClient } from './DeploymentTableClient';
import { EditDeploymentDialogClient } from './EditDeploymentDialogClient';
import { JobRunOutputDialogClient } from './JobRunOutputDialogClient';
import { useDeploymentActions } from './useDeploymentActions';

interface DeploymentListProps {
  initialDeployments: Deployment[];
  initialRepositories?: Repository[];
}

export function DeploymentContentClient({
  initialDeployments = [],
  initialRepositories = [],
}: DeploymentListProps) {
  const { toast } = useToast();

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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deploymentToEdit, setDeploymentToEdit] = useState<Deployment | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedDeploymentForConfig, setSelectedDeploymentForConfig] = useState<Deployment | null>(
    null,
  );
  const [showOutputDialog, setShowOutputDialog] = useState(false);
  const [selectedJobRunForOutput, setSelectedJobRunForOutput] = useState<any | null>(null);

  // Use the deployment actions hook
  const {
    actionInProgress,
    handleViewDeployment,
    handleDeleteClick,
    handleConfirmDelete,
    handleRunDeployment,
    handleEditClick,
    handleConfigClick,
    handleOutputClick,
    handleDuplicateClick,
    handleToggleActiveClick,
  } = useDeploymentActions(toast, setDeployments);

  // Setup auto-refresh every 30 seconds
  useEffect(() => {
    console.log('[DeploymentList] Setting up auto-refresh (30s interval)');

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
    const intervalId = setInterval(refreshData, 30000);

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

  // Enhanced action handlers that work with the hook but maintain component state
  const onDeleteClick = (deployment: Deployment, e: React.MouseEvent) => {
    handleDeleteClick(deployment, e);
    setSelectedDeployment(deployment);
    setIsDeleteDialogOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!selectedDeployment) return;

    await handleConfirmDelete(selectedDeployment);
    // Dialog is closed by the handler
  };

  const onEditClick = (deployment: Deployment, e: React.MouseEvent) => {
    handleEditClick(deployment, e);
    setDeploymentToEdit(deployment);
    setShowEditDialog(true);
  };

  const onConfigClick = (deployment: Deployment, e: React.MouseEvent) => {
    handleConfigClick(deployment, e);
    setSelectedDeploymentForConfig(deployment);
    setShowConfigDialog(true);
  };

  const onOutputClick = async (deployment: Deployment, e: React.MouseEvent) => {
    handleOutputClick(deployment, e);
    try {
      const { getJobRunsForConfig } = await import('@/app/actions/jobsAction');
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
      console.error('[DeploymentContentClient:onOutputClick] Error fetching job run:', error);
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
          <DeploymentTableClient
            displayDeployments={displayDeployments}
            activeTab={activeTab}
            searchQuery={searchQuery}
            filterStatus={filterStatus}
            isInitialLoad={isInitialLoad}
            actionInProgress={actionInProgress}
            isRunning={null}
            handleViewDeployment={handleViewDeployment}
            handleRunDeployment={handleRunDeployment}
            handleDeleteClick={onDeleteClick}
            handleEditClick={onEditClick}
            handleConfigClick={onConfigClick}
            handleOutputClick={onOutputClick}
            handleDuplicateClick={handleDuplicateClick}
            handleToggleActiveClick={handleToggleActiveClick}
          />
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
                onClick={onConfirmDelete}
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
