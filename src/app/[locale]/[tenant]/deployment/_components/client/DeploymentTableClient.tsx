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
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { getFormattedTime } from '@/lib/utils/deploymentUtils';
import { Deployment } from '@/types/component/deploymentComponentType';

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
}: DeploymentTableProps) {
  const c = useTranslations('common');

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

  if (isInitialLoad) {
    return (
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
    );
  }

  if (displayDeployments.length > 0) {
    return (
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
                          disabled={actionInProgress === deployment.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Temporary fix: Assume deployment is inactive if is_active is undefined. Need to identify correct field for active status. */}
                        {(deployment as any).is_active === true ? (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRunDeployment(deployment);
                              }}
                              disabled={
                                isRunning === deployment.id || actionInProgress === deployment.id
                              }
                            >
                              <PlayCircle className="mr-2 h-4 w-4" />
                              {isRunning === deployment.id ? 'Running...' : 'Run'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDeployment(deployment);
                              }}
                              disabled={actionInProgress === deployment.id}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Runs
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfigClick(deployment, e);
                              }}
                              disabled={actionInProgress === deployment.id}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {c('view_config')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOutputClick(deployment, e);
                              }}
                              disabled={actionInProgress === deployment.id}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Output
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(deployment, e);
                              }}
                              disabled={actionInProgress === deployment.id}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              {c('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateClick(deployment, e);
                              }}
                              disabled={actionInProgress === deployment.id}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
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
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleActiveClick(deployment, e);
                              }}
                              disabled={actionInProgress === deployment.id}
                            >
                              <EyeOff className="mr-2 h-4 w-4" />
                              Disable
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActiveClick(deployment, e);
                            }}
                            disabled={actionInProgress === deployment.id}
                          >
                            <Eye className="mr-2 h-4 w-4" />
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
