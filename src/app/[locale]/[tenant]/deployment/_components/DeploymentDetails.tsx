'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Terminal, Files, ChartBar, StopCircle, X } from 'lucide-react';
import { useDeployment } from '@/context';
import StatusBadge from './StatusBadge';
import { calculateDuration, formatDate } from '../utils';
import { DeploymentScript, DeploymentHost, Deployment } from '../types';

interface DeploymentDetailsProps {
  deploymentId: string;
  onBack?: () => void;
}

const DeploymentDetails: React.FC<DeploymentDetailsProps> = ({ 
  deploymentId, 
  onBack
}) => {
  const { 
    deployments,
    loading,
    isRefreshing,
    fetchDeploymentById,
    refreshDeployment,
    abortDeployment
  } = useDeployment();
  
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedScript, setSelectedScript] = useState<DeploymentScript | null>(null);

  useEffect(() => {
    const loadDeployment = async () => {
      const deploymentData = await fetchDeploymentById(deploymentId);
      setDeployment(deploymentData);
    };
    
    loadDeployment();
  }, [deploymentId, fetchDeploymentById]);

  const handleRefresh = async () => {
    const result = await refreshDeployment(deploymentId);
    if (result.success && result.deployment) {
      setDeployment(result.deployment);
    }
  };

  if (loading && !deployment) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Deployment not found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The deployment you're looking for doesn't exist or has been deleted.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleStopDeployment = async () => {
    if (window.confirm('Are you sure you want to stop this deployment? This action cannot be undone.')) {
      await abortDeployment(deploymentId);
    }
  };

  const handleViewScript = (script: DeploymentScript) => {
    setSelectedScript(script);
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center">
            {onBack && (
              <button
                onClick={onBack}
                className="mr-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{deployment.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Repository ID: {deployment.repositoryId} • ID: {deployment.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {deployment.status === 'in_progress' && (
              <button
                onClick={handleStopDeployment}
                className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium bg-white text-red-600 hover:bg-red-50 dark:bg-gray-700 dark:border-red-600/30 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Stop Deployment
              </button>
            )}
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Status:</span>
            <StatusBadge status={deployment.status} />
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Duration:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {calculateDuration(deployment.startedAt || deployment.createdAt, deployment.completedAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Started:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDate(deployment.startedAt || deployment.createdAt)}
          </span>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex -mb-px">
          <button
            className={`mr-1 py-2 px-4 text-sm font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`mr-1 py-2 px-4 text-sm font-medium flex items-center ${
              activeTab === 'logs'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('logs')}
          >
            <Terminal className="h-4 w-4 mr-2" />
            Logs
          </button>
          <button
            className={`mr-1 py-2 px-4 text-sm font-medium flex items-center ${
              activeTab === 'scripts'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('scripts')}
          >
            <Files className="h-4 w-4 mr-2" />
            Scripts
          </button>
          <button
            className={`mr-1 py-2 px-4 text-sm font-medium flex items-center ${
              activeTab === 'metrics'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('metrics')}
          >
            <ChartBar className="h-4 w-4 mr-2" />
            Metrics
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* High-level Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Status</h4>
                <div className="flex items-center">
                  <StatusBadge status={deployment.status} />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Duration</h4>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {calculateDuration(deployment.startedAt || deployment.createdAt, deployment.completedAt)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Hosts</h4>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {deployment.hosts.length}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Scripts</h4>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {deployment.scripts.length}
                </p>
              </div>
            </div>
            
            {/* Deployment Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Deployment Details</h3>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</div>
                    <div className="text-sm text-gray-900 dark:text-white sm:col-span-2 mt-1 sm:mt-0">{deployment.name}</div>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</div>
                    <div className="text-sm text-gray-900 dark:text-white sm:col-span-2 mt-1 sm:mt-0">
                      {deployment.description || <span className="text-gray-400 dark:text-gray-500">No description provided</span>}
                    </div>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Repository</div>
                    <div className="text-sm text-gray-900 dark:text-white sm:col-span-2 mt-1 sm:mt-0">{deployment.repositoryId}</div>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Created By</div>
                    <div className="text-sm text-gray-900 dark:text-white sm:col-span-2 mt-1 sm:mt-0">{deployment.createdBy}</div>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</div>
                    <div className="text-sm text-gray-900 dark:text-white sm:col-span-2 mt-1 sm:mt-0">{formatDate(deployment.createdAt)}</div>
                  </div>
                  {deployment.scheduledFor && (
                    <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Scheduled For</div>
                      <div className="text-sm text-gray-900 dark:text-white sm:col-span-2 mt-1 sm:mt-0">{formatDate(deployment.scheduledFor)}</div>
                    </div>
                  )}
                  {deployment.startedAt && (
                    <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Started At</div>
                      <div className="text-sm text-gray-900 dark:text-white sm:col-span-2 mt-1 sm:mt-0">{formatDate(deployment.startedAt)}</div>
                    </div>
                  )}
                  {deployment.completedAt && (
                    <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed At</div>
                      <div className="text-sm text-gray-900 dark:text-white sm:col-span-2 mt-1 sm:mt-0">{formatDate(deployment.completedAt)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Hosts */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Hosts ({deployment.hosts.length})</h3>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {deployment.hosts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No hosts selected for this deployment
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
                            Environment
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {deployment.hosts.map((host: DeploymentHost) => (
                          <tr key={host.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {host.name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                {host.environment || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <StatusBadge status={host.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
            {/* Scripts */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Scripts ({deployment.scripts.length})</h3>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {deployment.scripts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No scripts selected for this deployment
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
                            Path
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="relative px-4 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {deployment.scripts.map((script: DeploymentScript) => (
                          <tr key={script.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {script.name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {script.path}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <StatusBadge status={script.status} />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <button 
                                onClick={() => handleViewScript(script)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                View
                              </button>
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
        )}
        
        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 h-96 overflow-y-auto">
              {deployment.logs && deployment.logs.length > 0 ? (
                deployment.logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-500">[{formatDate(log.timestamp)}]</span> <span className={`${
                      log.level === 'ERROR' ? 'text-red-400' :
                      log.level === 'WARNING' ? 'text-yellow-400' :
                      log.level === 'INFO' ? 'text-blue-400' :
                      'text-gray-300'
                    }`}>{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 mt-16">
                  No logs available for this deployment
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Scripts Tab */}
        {activeTab === 'scripts' && (
          <div>
            {selectedScript ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{selectedScript.name}</h3>
                  <button 
                    onClick={() => setSelectedScript(null)}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 h-96 overflow-y-auto">
                  <pre>{selectedScript.logs ? selectedScript.logs.join('\n') : 'No script content available'}</pre>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deployment.scripts.map((script: DeploymentScript) => (
                  <div 
                    key={script.id} 
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => handleViewScript(script)}
                  >
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">{script.name}</h4>
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>Path: {script.path}</span>
                      <StatusBadge status={script.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4">
              <ChartBar className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Metrics coming soon</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Detailed metrics for deployments will be available in a future update
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentDetails;