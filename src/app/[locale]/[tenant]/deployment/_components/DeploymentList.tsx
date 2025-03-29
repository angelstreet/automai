'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  Play,
  Eye,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Deployment, Repository } from '../types';
import StatusBadge from './StatusBadge';
import { getFormattedTime } from '../utils';
import {
  runDeployment as runDeploymentAction,
  deleteDeployment as deleteDeploymentAction,
} from '@/app/actions/deployments';
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
import { Button } from '@/components/shadcn/button';

interface DeploymentListProps {
  deployments: Deployment[];
  repositories?: Repository[];
  onViewDeployment?: (deploymentId: string) => void;
}

export function DeploymentList({
  deployments = [],
  repositories = [],
  onViewDeployment,
}: DeploymentListProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [repositoriesMap, setRepositoriesMap] = useState<Record<string, Repository>>({});
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<string | null>(null);

  useEffect(() => {
    console.log('[DeploymentList] Loading state:', {
      isRefreshing,
      deployments: deployments.length,
      hasAttemptedLoad,
    });
    setHasAttemptedLoad(true);
  }, [isRefreshing, deployments.length]);

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

  const handleViewDeployment = (deployment: Deployment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onViewDeployment) {
      onViewDeployment(deployment.id);
    } else {
      router.push(`/deployment/${deployment.id}`);
    }
  };

  const handleDeleteClick = (deployment: Deployment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDeployment(deployment);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeployment) return;
    try {
      setActionInProgress(selectedDeployment.id);
      const success = await deleteDeploymentAction(selectedDeployment.id);
      if (success) {
        toast({
          title: 'Deployment Deleted',
          description: 'Successfully deleted.',
          variant: 'default',
        });
        router.refresh();
      } else {
        toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setActionInProgress(null);
    }
  };

  const getRepositoryName = (deployment: Deployment): string => {
    if (!deployment.repositoryId) return 'Unknown';
    const repo = repositoriesMap[deployment.repositoryId];
    return repo?.name || 'Unknown';
  };

  const getFilteredDeployments = () => {
    return deployments.filter((deployment) => {
      if (activeTab === 'scheduled' && deployment.scheduleType !== 'scheduled') return false;
      if (activeTab === 'pending' && deployment.status !== 'pending') return false;
      if (activeTab === 'active' && deployment.status === 'in_progress') return true;
      if (
        activeTab === 'completed' &&
        (deployment.status === 'success' || deployment.status === 'failed')
      )
        return true;
      const repoName = getRepositoryName(deployment);
      const matchesSearch =
        searchQuery === '' ||
        deployment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repoName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || deployment.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  };

  const getSortedDeployments = () => {
    const filtered = getFilteredDeployments();
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'repository') return getRepositoryName(a).localeCompare(getRepositoryName(b));
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      const dateA = new Date(a.startedAt || a.scheduledTime || a.createdAt).getTime();
      const dateB = new Date(b.startedAt || b.scheduledTime || b.createdAt).getTime();
      return dateB - dateA;
    });
  };

  const displayDeployments = getSortedDeployments();

  const renderSkeletonRows = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <tr key={`skeleton-${index}`} className="animate-pulse">
          <td className="px-2 py-3 whitespace-nowrap">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </td>
          <td className="px-2 py-3 whitespace-nowrap">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
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

  const handleRunDeployment = async (deployment: Deployment) => {
    if (isRunning === deployment.id) return;

    setIsRunning(deployment.id);
    try {
      const result = await runDeploymentAction(deployment.id);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Deployment started successfully',
          variant: 'default',
        });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to start deployment',
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

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search deployments..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="repository">Repository</option>
              </select>
              <label htmlFor="filterStatus" className="text-sm text-gray-600 dark:text-gray-400">
                Status:
              </label>
              <select
                id="filterStatus"
                className="pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex -mb-px">
              <button
                className={`mr-1 py-2 px-4 text-sm font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>
              <button
                className={`mr-1 py-2 px-4 text-sm font-medium flex items-center ${activeTab === 'scheduled' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('scheduled')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Scheduled
              </button>
              <button
                className={`mr-1 py-2 px-4 text-sm font-medium flex items-center ${activeTab === 'pending' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('pending')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Pending
              </button>
              <button
                className={`mr-1 py-2 px-4 text-sm font-medium flex items-center ${activeTab === 'active' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('active')}
              >
                <Play className="h-4 w-4 mr-2" />
                Active
              </button>
              <button
                className={`mr-1 py-2 px-4 text-sm font-medium flex items-center ${activeTab === 'completed' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('completed')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Completed
              </button>
            </div>
          </div>
          {isRefreshing ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
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
                      Repository
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
                      Runtime
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {renderSkeletonRows()}
                </tbody>
              </table>
            </div>
          ) : displayDeployments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
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
                      Repository
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
                      Runtime
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {displayDeployments.map((deployment) => (
                    <tr
                      key={deployment.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={(e) => handleViewDeployment(deployment, e)}
                    >
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {deployment.name}
                        </div>
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {getRepositoryName(deployment)}
                        </div>
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <StatusBadge status={deployment.status} />
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {getFormattedTime
                          ? getFormattedTime(deployment.createdAt)
                          : new Date(deployment.createdAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {deployment.completedAt && deployment.startedAt
                          ? getFormattedTime
                            ? getFormattedTime(deployment.startedAt, deployment.completedAt)
                            : `${Math.round((new Date(deployment.completedAt).getTime() - new Date(deployment.startedAt).getTime()) / 1000 / 60)} min`
                          : deployment.startedAt
                            ? 'Running...'
                            : deployment.scheduledTime
                              ? `Scheduled for ${getFormattedTime ? getFormattedTime(deployment.scheduledTime) : new Date(deployment.scheduledTime).toLocaleString()}`
                              : '-'}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-sm">
                        <div className="flex space-x-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDeployment(deployment);
                            }}
                          >
                            <Eye className="mr-1 h-3 w-3" /> View
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunDeployment(deployment);
                            }}
                            disabled={isRunning === deployment.id}
                          >
                            {isRunning === deployment.id ? (
                              <>
                                <span className="animate-spin mr-1">⟳</span> Running...
                              </>
                            ) : (
                              <>
                                <PlayCircle className="mr-1 h-3 w-3" /> Run
                              </>
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(deployment, e);
                            }}
                            disabled={actionInProgress === deployment.id}
                          >
                            <Trash2 className="mr-1 h-3 w-3" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : hasAttemptedLoad ? (
            <div className="text-center py-8">
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
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
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
                      Repository
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
                      Runtime
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {renderSkeletonRows()}
                </tbody>
              </table>
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
    </div>
  );
}
