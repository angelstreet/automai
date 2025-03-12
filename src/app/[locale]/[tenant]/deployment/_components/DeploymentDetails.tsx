'use client';

import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Terminal, Files, ChartBar, StopCircle, X } from 'lucide-react';
import { useDeploymentDetails } from '../useDeployments';
import StatusBadge from './StatusBadge';
import { calculateDuration, formatDate } from '../utils';
import { DeploymentScript } from '../types';

interface DeploymentDetailsProps {
  deploymentId: string;
  onBack?: () => void;
}

const DeploymentDetails: React.FC<DeploymentDetailsProps> = ({ 
  deploymentId, 
  onBack
}) => {
  const { 
    deployment, 
    loading, 
    isRefreshing, 
    refreshDeployment,
    abortDeployment
  } = useDeploymentDetails(deploymentId);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedScript, setSelectedScript] = useState<DeploymentScript | null>(null);

  if (loading) {
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

  const handleRefresh = () => {
    refreshDeployment();
  };

  const handleStopDeployment = async () => {
    if (window.confirm('Are you sure you want to stop this deployment? This action cannot be undone.')) {
      await abortDeployment();
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
                {deployment.repository.owner}/{deployment.repository.name} • ID: {deployment.id}
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
              {calculateDuration(deployment.startTime, deployment.endTime)}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Started:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDate(deployment.startTime)}
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
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Description</h3>
              <p className="text-gray-700 dark:text-gray-300">
                {deployment.description || 'No description provided.'}
              </p>
            </div>
            
            {/* Scripts Summary */}
            <div>
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Scripts Status</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Script
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {deployment.scripts.map((script) => (
                      <tr key={script.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => handleViewScript(script)}>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {script.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {script.path}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={script.status} />
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {calculateDuration(script.startTime, script.endTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hosts Summary */}
            <div>
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Target Hosts</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Host
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Environment
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {deployment.hosts.map((host) => (
                      <tr key={host.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {host.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {host.environment}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={host.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Deployment Logs</h3>
              <button className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded dark:bg-gray-700 dark:text-gray-300">
                Download Logs
              </button>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 p-4 overflow-auto h-96 font-mono text-sm">
              {deployment.logs.map((log, index) => {
                let textColor = 'text-gray-700 dark:text-gray-300';
                if (log.level === 'ERROR') textColor = 'text-red-600 dark:text-red-400';
                else if (log.level === 'WARNING') textColor = 'text-yellow-600 dark:text-yellow-400';
                else if (log.level === 'INFO') textColor = 'text-blue-600 dark:text-blue-400';
                
                return (
                  <div key={index} className="py-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(log.timestamp)}
                    </span>
                    <span className={`ml-2 text-xs font-medium ${textColor}`}>[{log.level}]</span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Scripts Tab */}
        {activeTab === 'scripts' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Script list */}
            <div className="md:col-span-1 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white">Scripts</h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {deployment.scripts.map((script) => (
                  <div 
                    key={script.id} 
                    className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedScript?.id === script.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => handleViewScript(script)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-gray-900 dark:text-white">{script.name}</div>
                      <StatusBadge status={script.status} />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {calculateDuration(script.startTime, script.endTime)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Script output */}
            <div className="md:col-span-3 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {selectedScript ? selectedScript.name : 'Select a script'}
                </h3>
                {selectedScript && (
                  <StatusBadge status={selectedScript.status} />
                )}
              </div>
              <div className="p-4">
                {selectedScript ? (
                  <div>
                    <div className="mb-2 text-sm">
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">Path:</span> {selectedScript.path}</div>
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">Started:</span> {formatDate(selectedScript.startTime)}</div>
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">Duration:</span> {calculateDuration(selectedScript.startTime, selectedScript.endTime)}</div>
                    </div>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 p-4 overflow-auto h-80 font-mono text-sm">
                      {selectedScript.output ? (
                        selectedScript.output.split('\n').map((line, index) => (
                          <div key={index} className="py-0.5">{line}</div>
                        ))
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400">No output available.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Select a script to view its output
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div>
            <div className="text-center py-8">
              <ChartBar className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Metrics Coming Soon</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Detailed performance metrics for this deployment will be available in a future update.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Script Selection Modal */}
      {selectedScript && activeTab !== 'scripts' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">{selectedScript.name}</h3>
              <button onClick={() => setSelectedScript(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <StatusBadge status={selectedScript.status} />
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Duration: {calculateDuration(selectedScript.startTime, selectedScript.endTime)}
                </div>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 p-4 overflow-auto max-h-96 font-mono text-sm">
                {selectedScript.output ? (
                  selectedScript.output.split('\n').map((line, index) => (
                    <div key={index} className="py-0.5">{line}</div>
                  ))
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">No output available.</div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button 
                onClick={() => setSelectedScript(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-md text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeploymentDetails;