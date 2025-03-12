'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Clock, 
  RefreshCw, 
  Play, 
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { useDeployments } from '../useDeployments';
import { Deployment } from '../types';
import StatusBadge from './StatusBadge';
import { getFormattedTime } from '../utils';

interface DeploymentListProps {
  onViewDeployment?: (deploymentId: string) => void;
}

const DeploymentList: React.FC<DeploymentListProps> = ({ 
  onViewDeployment 
}) => {
  const { deployments, loading, isRefreshing, fetchDeployments } = useDeployments();
  
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');

  // Handle refresh button click
  const handleRefresh = () => {
    fetchDeployments();
  };

  // Handle viewing a deployment
  const handleViewDeployment = (deployment: Deployment) => {
    if (onViewDeployment) {
      onViewDeployment(deployment.id);
    }
  };

  // Filter deployments based on tab, search query, and status filter
  const getFilteredDeployments = () => {
    return deployments.filter(deployment => {
      // Filter by tab
      if (activeTab === 'scheduled' && !deployment.scheduledTime) return false;
      if (activeTab === 'active' && deployment.status !== 'in_progress') return false;
      if (activeTab === 'completed' && (deployment.status !== 'success' && deployment.status !== 'failed')) return false;

      // Filter by search query
      const matchesSearch = 
        searchQuery === '' || 
        deployment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deployment.repository.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deployment.createdBy.toLowerCase().includes(searchQuery.toLowerCase());

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
        return a.repository.name.localeCompare(b.repository.name);
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      } else {
        // Default: sort by date (newest first)
        const dateA = new Date(a.startTime || a.scheduledTime || 0).getTime();
        const dateB = new Date(b.startTime || b.scheduledTime || 0).getTime();
        return dateB - dateA;
      }
    });
  };

  const displayDeployments = getSortedDeployments();

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Search deployments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
              </select>
              <button 
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
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
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : displayDeployments.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4">
                {activeTab === 'scheduled' ? <Clock className="h-12 w-12" /> : 
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
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Repository
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created By
                    </th>
                    <th scope="col" className="relative px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {displayDeployments.map((deployment) => (
                    <tr key={deployment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {deployment.name}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {deployment.repository.owner}/{deployment.repository.name}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={deployment.status} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {getFormattedTime(deployment)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {deployment.createdBy}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end">
                          <button 
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                            onClick={() => handleViewDeployment(deployment)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <div className="relative inline-block text-left">
                            <button type="button" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeploymentList;