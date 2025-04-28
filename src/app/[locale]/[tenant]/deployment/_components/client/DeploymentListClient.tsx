'use client';

import { Search, Clock, Play } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Deployment } from '@/types/component/deploymentComponentType';
import { Repository } from '@/types/component/repositoryComponentType';

import { DeploymentActionsClient } from './DeploymentActionsClient';
import { JobDetailsListClient } from './JobDetailsListClient';

interface DeploymentListProps {
  initialDeployments: Deployment[];
  initialRepositories?: Repository[];
}

export function DeploymentListClient({
  initialDeployments = [],
  initialRepositories = [],
}: DeploymentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [isRefreshing, _setIsRefreshing] = useState(false);
  const [deployments, setDeployments] = useState<Deployment[]>(initialDeployments);

  // Listen for refresh events
  useEffect(() => {
    console.log('[DeploymentList] Using direct revalidation instead of events');
    return () => {
      // No cleanup needed
    };
  }, []);

  // Update deployments when initialDeployments prop changes
  useEffect(() => {
    console.log('[DeploymentList] Updating deployments from new props', {
      count: initialDeployments.length,
    });
    setDeployments(initialDeployments);
  }, [initialDeployments]);

  // Use deployments state for rendering

  useEffect(() => {
    console.log('[DeploymentList] Loading state:', {
      isRefreshing,
      deployments: deployments.length,
      hasAttemptedLoad,
    });
    setHasAttemptedLoad(true);
  }, [isRefreshing, deployments.length, hasAttemptedLoad]);

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
          {isRefreshing ? (
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
                  {renderSkeletonRows()}
                </tbody>
              </table>
            </div>
          ) : hasAttemptedLoad ? (
            <JobDetailsListClient
              deployments={deployments}
              repositories={initialRepositories}
              searchQuery={searchQuery}
              filterStatus={filterStatus}
              activeTab={activeTab}
              sortBy={sortBy}
            />
          ) : (
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
                  {renderSkeletonRows()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
