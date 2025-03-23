'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  RefreshCw, 
  Play, 
  MoreHorizontal,
  Trash
} from 'lucide-react';
import { useDeployment } from '@/context';
import { Deployment, Repository } from '../types';
import StatusBadge from './StatusBadge';
import { getFormattedTime } from '../utils';
import { deleteDeployment as deleteDeploymentAction } from '../actions';
import { DeploymentContextType } from '@/types/context/deployment';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
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
import { toast } from '@/components/shadcn/use-toast';
import { DeploymentActions } from './DeploymentActions';

interface DeploymentListProps {
  onViewDeployment?: (deploymentId: string) => void;
}

const DeploymentList: React.FC<DeploymentListProps> = ({ 
  onViewDeployment 
}) => {
  // Get deployment context
  const deploymentContext = useDeployment();
  
  const { 
    deployments = [], 
    repositories: contextRepositories = [],
    loading,
    error = null, 
    fetchDeployments = () => {}, 
    isRefreshing = false,
    fetchRepositories = () => {} 
  } = deploymentContext || {};
  
  // Only show loading if explicitly true AND we have no deployments data
  const isLoading = loading === true && deployments.length === 0;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [repositories, setRepositories] = useState<Record<string, Repository>>({});
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  // Set hasAttemptedLoad when data loads or loading completes
  useEffect(() => {
    if (!hasAttemptedLoad && (deployments.length > 0 || !isLoading)) {
      setHasAttemptedLoad(true);
    }
  }, [deployments.length, isLoading, hasAttemptedLoad]);

  // Convert context repositories to mapping if available
  useEffect(() => {
    if (contextRepositories && contextRepositories.length > 0 && Object.keys(repositories).length === 0) {
      const repoMap = contextRepositories.reduce((acc: Record<string, Repository>, repo: Repository) => {
        acc[repo.id] = repo;
        return acc;
      }, {} as Record<string, Repository>);
      setRepositories(repoMap);
    }
  }, [contextRepositories, repositories]);

  // Fetch repositories on component mount
  useEffect(() => {
    const loadRepositories = async () => {
      // Skip fetching repositories if we already have them loaded
      if (Object.keys(repositories).length > 0) {
        return;
      }
      
      // Use repositories from context if available
      if (contextRepositories && contextRepositories.length > 0) {
        const repoMap = contextRepositories.reduce((acc: Record<string, Repository>, repo: Repository) => {
          acc[repo.id] = repo;
          return acc;
        }, {} as Record<string, Repository>);
        setRepositories(repoMap);
        return;
      }
      
      console.log('[DeploymentList] No repositories available yet, will wait for context update');
    };

    loadRepositories();
  }, [repositories, contextRepositories]);

  // Handle refresh button click with debounce
  const handleRefresh = () => {
    if (isRefreshing) {
      // Don't allow refresh while already refreshing
      return;
    }
    fetchDeployments();
  };

  // Handle viewing a deployment
  const handleViewDeployment = (deployment: Deployment, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (onViewDeployment) {
      onViewDeployment(deployment.id);
    }
  };

  // Handle delete click
  const handleDeleteClick = (deployment: Deployment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDeployment(deployment);
    setIsDeleteDialogOpen(true);
  };

  // Confirm deletion of a deployment
  const handleConfirmDelete = async () => {
    if (!selectedDeployment) return;
    
    try {
      if (deploymentContext && 'deleteDeployment' in deploymentContext && 
          typeof deploymentContext.deleteDeployment === 'function') {
        // Use the deleteDeployment from the context with type assertion
        const deleteDeploymentFn = deploymentContext.deleteDeployment as (id: string) => Promise<{
          success: boolean;
          error?: string;
        }>;
        
        // Call the function with the correct type
        const result = await deleteDeploymentFn(selectedDeployment.id);
        
        if (result.success) {
          // Always show success toast unless an error is thrown
          toast({
            title: 'Deployment Deleted',
            description: 'The deployment has been successfully deleted.',
            variant: 'default',
          });
          
          // Refresh the list
          fetchDeployments();
        } else {
          // Show error toast if deleteDeployment returns failure
          toast({
            title: 'Error',
            description: result.error || 'Failed to delete the deployment',
            variant: 'destructive',
          });
        }
      } else {
        // Fallback to using the action directly
        const success = await deleteDeploymentAction(selectedDeployment.id);
        
        if (success) {
          toast({
            title: 'Deployment Deleted',
            description: 'The deployment has been successfully deleted.',
            variant: 'default',
          });
          
          // Refresh the list
          fetchDeployments();
        } else {
          toast({
            title: 'Error',
            description: 'Failed to delete the deployment',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  // Get repository name from deployment
  const getRepositoryName = (deployment: Deployment): string => {
    if (!deployment.repositoryId) {
      return 'Unknown';
    }
    
    // First try local state
    if (repositories[deployment.repositoryId]) {
      return repositories[deployment.repositoryId].name;
    }
    
    // Then try context directly as a fallback
    const contextRepo = contextRepositories?.find(r => r.id === deployment.repositoryId);
    if (contextRepo) {
      // Update our local cache for next time
      const newRepos = { ...repositories };
      newRepos[deployment.repositoryId] = contextRepo;
      setRepositories(newRepos);
      return contextRepo.name;
    }
    
    // Debug missing repos
    console.log(`[DeploymentList] Repository not found for ID: ${deployment.repositoryId}`);
    
    // Fallback to the repository ID if name can't be found
    return deployment.repositoryId;
  };

  // Filter deployments based on tab, search query, and status filter
  const getFilteredDeployments = () => {
    return deployments.filter(deployment => {
      // Filter by tab
      if (activeTab === 'scheduled' && deployment.scheduleType !== 'scheduled') return false;
      if (activeTab === 'pending' && deployment.status !== 'pending') return false;
      if (activeTab === 'active' && deployment.status !== 'in_progress') return false;
      if (activeTab === 'completed' && (deployment.status !== 'success' && deployment.status !== 'failed')) return false;

      // Filter by search query
      const repoName = getRepositoryName(deployment);
      const matchesSearch = 
        searchQuery === '' || 
        deployment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deployment.userId.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by status
      const matchesStatus = filterStatus === 'all' || deployment.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  };

  // Sort deployments
  const getSortedDeployments = () => {
    const filtered = getFilteredDeployments();
    
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'repository') {
        return getRepositoryName(a).localeCompare(getRepositoryName(b));
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      } else {
        // Default: sort by date (newest first)
        const dateA = new Date(a.startedAt || a.scheduledTime || a.createdAt).getTime();
        const dateB = new Date(b.startedAt || b.scheduledTime || b.createdAt).getTime();
        return dateB - dateA;
      }
    });
  };

  const displayDeployments = getSortedDeployments();

  // Render loading skeleton rows
  const renderSkeletonRows = () => {
    return Array(5).fill(0).map((_, index) => (
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
                className={`mr-1 py-2 px-4 text-sm font-medium ${
                  activeTab === 'all'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>
              <button
                className={`mr-1 py-2 px-4 text-sm font-medium flex items-center ${
                  activeTab === 'scheduled'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('scheduled')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Scheduled
              </button>
              <button
                className={`mr-1 py-2 px-4 text-sm font-medium flex items-center ${
                  activeTab === 'pending'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('pending')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Pending
              </button>
              <button
                className={`mr-1 py-2 px-4 text-sm font-medium flex items-center ${
                  activeTab === 'active'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('active')}
              >
                <Play className="h-4 w-4 mr-2" />
                Active
              </button>
              <button
                className={`mr-1 py-2 px-4 text-sm font-medium flex items-center ${
                  activeTab === 'completed'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('completed')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Completed
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="overflow-x-auto">
              <div className="relative">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Repository
                      </th>
                      <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Runtime
                      </th>
                      <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {renderSkeletonRows()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : hasAttemptedLoad && displayDeployments.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4">
                {activeTab === 'scheduled' ? <Clock className="h-12 w-12" /> : 
                 activeTab === 'pending' ? <Clock className="h-12 w-12" /> :
                 activeTab === 'active' ? <Play className="h-12 w-12" /> :
                 activeTab === 'completed' ? <Clock className="h-12 w-12" /> :
                 <Clock className="h-12 w-12" />}
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No deployments found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try changing your search or filter criteria'
                  : 'Create your first deployment to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="relative">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Repository
                      </th>
                      <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Runtime
                      </th>
                      <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayDeployments.map((deployment) => (
                      <tr 
                        key={deployment.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer relative group"
                        onClick={(e) => handleViewDeployment(deployment, e)}
                      >
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{deployment.name}</div>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-300">{getRepositoryName(deployment)}</div>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <StatusBadge status={deployment.status} />
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {getFormattedTime(deployment.createdAt)}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {deployment.completedAt && deployment.startedAt 
                            ? getFormattedTime(deployment.startedAt, deployment.completedAt) 
                            : deployment.startedAt 
                              ? 'Running...' 
                              : deployment.scheduledTime 
                                ? `Scheduled for ${getFormattedTime(deployment.scheduledTime)}` 
                                : '-'}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-sm text-right">
                          <DeploymentActions deploymentId={deployment.id} deploymentName={deployment.name} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Deployment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedDeployment?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default DeploymentList;