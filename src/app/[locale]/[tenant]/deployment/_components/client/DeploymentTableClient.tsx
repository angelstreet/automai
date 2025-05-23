'use client';

import {
  Clock,
  Play,
  Eye,
  EyeOff,
  PlayCircle,
  Trash2,
  MoreHorizontal,
  Edit2,
  Copy,
  FolderPlus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { getActiveWorkspace, getBulkWorkspaceMappings } from '@/app/actions/workspaceAction';
import { Button } from '@/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import AddToWorkspace from '@/components/workspace/AddToWorkspace';
import { getFormattedTime } from '@/lib/utils/deploymentUtils';
import { Deployment } from '@/types/component/deploymentComponentType';

import DeploymentEventListener, { DeploymentEvents } from './DeploymentEventListener';
import DeploymentStatusBadgeClient from './DeploymentStatusBadgeClient';

interface DeploymentTableProps {
  displayDeployments: Deployment[];
  activeTab: string;
  searchQuery: string;
  filterStatus: string;
  isInitialLoad: boolean;
  actionInProgress: string | null;
  isRunning: string | null;
  // Handlers
  handleViewDeployment: (deployment: Deployment, e?: React.MouseEvent) => void;
  handleRunDeployment: (deployment: Deployment) => Promise<void>;
  handleDeleteClick: (deployment: Deployment, e: React.MouseEvent) => void;
  handleEditClick: (deployment: Deployment, e: React.MouseEvent) => void;
  handleConfigClick: (deployment: Deployment, e: React.MouseEvent) => void;
  handleOutputClick: (deployment: Deployment, e: React.MouseEvent) => void;
  handleDuplicateClick: (deployment: Deployment, e: React.MouseEvent) => void;
  handleToggleActiveClick: (deployment: Deployment, e: React.MouseEvent) => void;
}

export function DeploymentTableClient({
  displayDeployments,
  activeTab,
  searchQuery,
  filterStatus,
  isInitialLoad,
  actionInProgress,
  isRunning,
  handleViewDeployment,
  handleRunDeployment,
  handleDeleteClick,
  handleEditClick,
  handleConfigClick,
  handleOutputClick,
  handleDuplicateClick,
  handleToggleActiveClick,
  params: _params,
}: DeploymentTableProps & { params: { locale: string; tenant: string } }) {
  const c = useTranslations('common');
  const t = useTranslations('deployment');

  // State to manage dropdown visibility for each deployment
  const [openViewDropdowns, setOpenViewDropdowns] = useState<Record<string, boolean>>({});
  const [openActionsDropdowns, setOpenActionsDropdowns] = useState<Record<string, boolean>>({});
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
  const [filteredDeployments, setFilteredDeployments] = useState<Deployment[]>(displayDeployments);

  // Fetch active workspace and related deployments
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        // Get active workspace
        const workspaceResult = await getActiveWorkspace();
        if (workspaceResult.success) {
          setActiveWorkspace(workspaceResult.data || null);
        }
      } catch (error) {
        console.error('[@component:DeploymentTableClient] Error fetching workspace data:', error);
      }
    };

    fetchWorkspaceData();

    // Listen for workspace change events
    const handleWorkspaceChange = () => {
      console.log('[@component:DeploymentTableClient] Workspace change detected, refreshing data');
      fetchWorkspaceData();
    };

    // Add event listener for workspace changes using standardized event name
    window.addEventListener(DeploymentEvents.WORKSPACE_CHANGED, handleWorkspaceChange);

    // Cleanup function
    return () => {
      window.removeEventListener(DeploymentEvents.WORKSPACE_CHANGED, handleWorkspaceChange);
    };
  }, []);

  // Filter deployments whenever displayDeployments or active workspace changes
  useEffect(() => {
    const filterByWorkspace = async () => {
      // First filter by search query
      let filtered = displayDeployments;

      // Apply search filter if search query exists
      if (searchQuery && searchQuery.trim() !== '') {
        console.log('[@component:DeploymentTableClient] Filtering by search query:', searchQuery);

        const normalizedQuery = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (deployment) =>
            deployment.name.toLowerCase().includes(normalizedQuery) ||
            (deployment.description &&
              deployment.description.toLowerCase().includes(normalizedQuery)),
        );
      }

      // Apply status filter if not set to 'all'
      if (filterStatus && filterStatus !== 'all') {
        console.log('[@component:DeploymentTableClient] Filtering by status:', filterStatus);

        filtered = filtered.filter(
          (deployment) => deployment.status.toLowerCase() === filterStatus.toLowerCase(),
        );
      }

      // Then filter by workspace if active
      if (activeWorkspace) {
        console.log(
          '[@component:DeploymentTableClient] Filtering by active workspace:',
          activeWorkspace,
        );

        // Use bulk operation to fetch workspace mappings for all deployments at once
        const deploymentIds = filtered.map((deployment) => deployment.id);
        const result = await getBulkWorkspaceMappings('deployment', deploymentIds);

        if (result.success && result.data) {
          // Filter deployments to only those in the active workspace
          filtered = filtered.filter((deployment) => {
            const workspaceIds = result.data[deployment.id] || [];
            return workspaceIds.includes(activeWorkspace);
          });

          setFilteredDeployments(filtered);
          console.log(
            `[@component:DeploymentTableClient] Filtered to ${filtered.length} deployments in workspace using bulk operation`,
          );
        } else {
          console.error(
            '[@component:DeploymentTableClient] Error fetching workspace mappings:',
            result.error,
          );
          setFilteredDeployments(filtered);
        }
      } else {
        // If no active workspace, use the filtered deployments
        setFilteredDeployments(filtered);
        console.log(
          `[@component:DeploymentTableClient] No active workspace, showing filtered ${filtered.length} deployments`,
        );
      }
    };

    filterByWorkspace();
  }, [displayDeployments, activeWorkspace, searchQuery, filterStatus]);

  // Functions to toggle dropdown visibility
  const toggleViewDropdown = (deploymentId: string, open: boolean) => {
    setOpenViewDropdowns((prev) => ({ ...prev, [deploymentId]: open }));
  };

  const toggleActionsDropdown = (deploymentId: string, open: boolean) => {
    setOpenActionsDropdowns((prev) => ({ ...prev, [deploymentId]: open }));
  };

  // Custom handler to run deployment and redirect if playwright is in env
  const customHandleRunDeployment = async (deployment: Deployment) => {
    try {
      // Execute the original run logic
      await handleRunDeployment(deployment);
    } catch (error) {
      console.error(
        '[@component:DeploymentTableClient:customHandleRunDeployment] Error running deployment:',
        error,
      );
    }
  };

  const renderSkeletonRows = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <tr key={`skeleton-${index}`} className="animate-pulse">
          <td className="px-2 py-0.5 whitespace-nowrap">
            <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </td>
          <td className="px-2 py-0.5 whitespace-nowrap">
            <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </td>
          <td className="px-2 py-0.5 whitespace-nowrap">
            <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </td>
          <td className="px-2 py-0.5 whitespace-nowrap">
            <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </td>
          <td className="px-2 py-0.5 whitespace-nowrap">
            <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
          </td>
        </tr>
      ));
  };

  if (isInitialLoad) {
    return (
      <div className="overflow-x-auto">
        <DeploymentEventListener />
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-transparent dark:bg-transparent">
            <tr>
              <th
                scope="col"
                className="px-2 py-0.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-2 py-0.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-2 py-0.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Created
              </th>
              <th
                scope="col"
                className="px-2 py-0.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Last Run
              </th>
              <th
                scope="col"
                className="px-2 py-0.5 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                View
              </th>
              <th
                scope="col"
                className="px-2 py-0.5 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
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
    );
  }

  if (filteredDeployments.length > 0) {
    return (
      <div className="overflow-x-auto">
        <DeploymentEventListener />
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-transparent dark:bg-transparent">
            <tr>
              <th
                scope="col"
                className="px-2 py-0.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-2 py-0.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-2 py-0.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Created
              </th>
              <th
                scope="col"
                className="px-2 py-0.5 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Last Run
              </th>
              <th
                scope="col"
                className="px-2 py-0.5 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Run
              </th>
              <th
                scope="col"
                className="px-2 py-0.5 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                View
              </th>
              <th
                scope="col"
                className="px-2 py-0.5 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-transparent dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
            {filteredDeployments.map((deployment) => (
              <tr
                key={deployment.id}
                className="hover:bg-gray-800/10 dark:hover:bg-gray-700/30 cursor-pointer"
                onClick={(e) => handleViewDeployment(deployment, e)}
              >
                <td className="px-2 py-0.5 whitespace-nowrap">
                  <div className="text-xs text-gray-900 dark:text-white">{deployment.name}</div>
                </td>
                <td className="px-2 py-0.5 whitespace-nowrap">
                  <DeploymentStatusBadgeClient status={deployment.status} />
                </td>
                <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                  {getFormattedTime
                    ? getFormattedTime(deployment.createdAt)
                    : new Date(deployment.createdAt).toLocaleString()}
                </td>
                <td className="px-2 py-0.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
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
                <td className="px-2 py-0.5 whitespace-nowrap text-xs">
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        customHandleRunDeployment(deployment);
                      }}
                      disabled={isRunning === deployment.id || actionInProgress === deployment.id}
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      {isRunning === deployment.id ? 'Running...' : ''}
                    </Button>
                  </div>
                </td>
                <td className="px-2 py-0.5 whitespace-nowrap text-xs">
                  <div className="flex justify-center">
                    <DropdownMenu
                      open={openViewDropdowns[deployment.id] || false}
                      onOpenChange={(open) => toggleViewDropdown(deployment.id, open)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 flex items-center justify-center"
                          disabled={actionInProgress === deployment.id}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDeployment(deployment);
                            toggleViewDropdown(deployment.id, false);
                          }}
                          disabled={actionInProgress === deployment.id}
                          className="text-xs py-1.5 h-7"
                        >
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          View Runs
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfigClick(deployment, e);
                            toggleViewDropdown(deployment.id, false);
                          }}
                          disabled={actionInProgress === deployment.id}
                          className="text-xs py-1.5 h-7"
                        >
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          {t('view_config')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOutputClick(deployment, e);
                            toggleViewDropdown(deployment.id, false);
                          }}
                          disabled={actionInProgress === deployment.id}
                          className="text-xs py-1.5 h-7"
                        >
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          {t('view_output')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            if (deployment.report_url) {
                              window.open(deployment.report_url, '_blank');
                            } else {
                              console.log(
                                '[@component:DeploymentTableClient] No report URL available for deployment:',
                                deployment.id,
                              );
                            }
                            toggleViewDropdown(deployment.id, false);
                          }}
                          disabled={actionInProgress === deployment.id || !deployment.report_url}
                          className="text-xs py-1.5 h-7"
                        >
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          {t('view_report')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
                <td className="px-2 py-0.5 whitespace-nowrap text-xs">
                  <div className="flex justify-center">
                    <DropdownMenu
                      open={openActionsDropdowns[deployment.id] || false}
                      onOpenChange={(open) => toggleActionsDropdown(deployment.id, open)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 flex items-center justify-center"
                          disabled={actionInProgress === deployment.id}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        {(deployment as any).is_active === true ? (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(deployment, e);
                                toggleActionsDropdown(deployment.id, false);
                              }}
                              disabled={actionInProgress === deployment.id}
                              className="text-xs py-1.5 h-7"
                            >
                              <Edit2 className="mr-2 h-3.5 w-3.5" />
                              {c('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateClick(deployment, e);
                                toggleActionsDropdown(deployment.id, false);
                              }}
                              disabled={actionInProgress === deployment.id}
                              className="text-xs py-1.5 h-7"
                            >
                              <Copy className="mr-2 h-3.5 w-3.5" />
                              Duplicate
                            </DropdownMenuItem>
                            <AddToWorkspace
                              itemType="deployment"
                              itemId={deployment.id}
                              trigger={
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                  }}
                                  disabled={actionInProgress === deployment.id}
                                  className="text-xs py-1.5 h-7"
                                >
                                  <FolderPlus className="mr-2 h-3.5 w-3.5" />
                                  Workspaces
                                </DropdownMenuItem>
                              }
                            />
                            <DropdownMenuItem
                              className="text-xs py-1.5 h-7 text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(deployment, e);
                                toggleActionsDropdown(deployment.id, false);
                              }}
                              disabled={actionInProgress === deployment.id}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleActiveClick(deployment, e);
                                toggleActionsDropdown(deployment.id, false);
                              }}
                              disabled={actionInProgress === deployment.id}
                              className="text-xs py-1.5 h-7"
                            >
                              <EyeOff className="mr-2 h-3.5 w-3.5" />
                              Disable
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActiveClick(deployment, e);
                              toggleActionsDropdown(deployment.id, false);
                            }}
                            disabled={actionInProgress === deployment.id}
                            className="text-xs py-1.5 h-7"
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            Enable
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <DeploymentEventListener />
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
    </>
  );
}
