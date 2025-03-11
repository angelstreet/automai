'use client';

import React, { useState } from 'react';
import { Search, Filter, Clock, SortAsc, SortDesc } from 'lucide-react';
import DeploymentListItem from './DeploymentListItem';
import { Deployment } from './types';

interface DeploymentListProps {
  deployments: Deployment[];
  onDeploymentSelect: (deployment: Deployment) => void;
}

type SortField = 'name' | 'date' | 'status';
type SortOrder = 'asc' | 'desc';

const DeploymentList = ({ deployments, onDeploymentSelect }: DeploymentListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Filter deployments based on search term and status filter
  const filteredDeployments = deployments.filter((deployment) => {
    const matchesSearch =
      deployment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.createdBy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter ? deployment.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  // Get unique statuses for filter dropdown
  const statuses = Array.from(new Set(deployments.map((d) => d.status)));

  // Sort deployments
  const sortedDeployments = [...filteredDeployments].sort((a, b) => {
    if (sortField === 'name') {
      return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else if (sortField === 'status') {
      return sortOrder === 'asc'
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    } else {
      // Sort by date (using startTime or scheduledTime as fallback)
      const dateA = new Date(a.startTime || a.scheduledTime || 0).getTime();
      const dateB = new Date(b.startTime || b.scheduledTime || 0).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });

  // Toggle sort order or change sort field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
            size={16}
          />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Search deployments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <select
              className="appearance-none pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || null)}
            >
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Filter
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
              size={16}
            />
          </div>

          <button
            onClick={() => handleSort('name')}
            className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 ${
              sortField === 'name' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'
            } text-gray-700 dark:text-gray-200`}
            title="Sort by name"
          >
            {sortField === 'name' ? (
              sortOrder === 'asc' ? (
                <SortAsc size={16} />
              ) : (
                <SortDesc size={16} />
              )
            ) : (
              'Name'
            )}
          </button>

          <button
            onClick={() => handleSort('date')}
            className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 ${
              sortField === 'date' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'
            } text-gray-700 dark:text-gray-200`}
            title="Sort by date"
          >
            {sortField === 'date' ? (
              sortOrder === 'asc' ? (
                <SortAsc size={16} />
              ) : (
                <SortDesc size={16} />
              )
            ) : (
              <Clock size={16} />
            )}
          </button>
        </div>
      </div>

      {sortedDeployments.length === 0 ? (
        <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">No deployments found</p>
        </div>
      ) : (
        <div>
          {sortedDeployments.map((deployment) => (
            <DeploymentListItem
              key={deployment.id}
              deployment={deployment}
              onClick={onDeploymentSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DeploymentList;
