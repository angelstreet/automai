'use client';

import React, { useState } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import { Deployment } from './types';
import StatusBadge from './StatusBadge';
import { formatDetailedDate, calculateDuration } from './utils';

interface DeploymentDetailsModalProps {
  deployment: Deployment;
  onClose: () => void;
}

const DeploymentDetailsModal = ({ deployment, onClose }: DeploymentDetailsModalProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Render log entry with appropriate styling
  const renderLogEntry = (log: { timestamp: string; level: string; message: string }) => {
    let textColor = 'text-gray-700 dark:text-gray-300';
    if (log.level === 'ERROR') textColor = 'text-red-600 dark:text-red-400';
    else if (log.level === 'WARNING') textColor = 'text-yellow-600 dark:text-yellow-400';
    else if (log.level === 'INFO') textColor = 'text-blue-600 dark:text-blue-400';
    
    return (
      <div key={log.timestamp} className="py-1 border-b dark:border-gray-700 last:border-b-0">
        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDetailedDate(log.timestamp)}</span>
        <span className={`ml-2 text-xs font-medium ${textColor}`}>[{log.level}]</span>
        <span className="ml-2 text-sm dark:text-gray-300">{log.message}</span>
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b dark:border-gray-700 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{deployment.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Project: {deployment.projectName} • Deployment ID: {deployment.id}
            </p>
          </div>
          <button
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="border-b dark:border-gray-700">
          <div className="flex">
            <button
              className={`px-6 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`px-6 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('logs')}
            >
              Logs
            </button>
            <button
              className={`px-6 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('results')}
            >
              Results
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 text-gray-900 dark:text-gray-100">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Deployment Info */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Deployment Information</h3>
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                      <div className="font-medium mt-1">
                        <StatusBadge status={deployment.status} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Created By</p>
                      <p className="font-medium mt-1 dark:text-gray-300">{deployment.createdBy || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Started At</p>
                      <p className="font-medium mt-1 dark:text-gray-300">{formatDetailedDate(deployment.startTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Completed At</p>
                      <p className="font-medium mt-1 dark:text-gray-300">{formatDetailedDate(deployment.endTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                      <p className="font-medium mt-1 dark:text-gray-300">
                        {calculateDuration(deployment.startTime, deployment.endTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Jenkins Job</p>
                      <p className="font-medium mt-1 flex items-center">
                        <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                          View in Jenkins
                          <ExternalLink size={14} className="ml-1" />
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Scripts */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Scripts</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Path</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {deployment.scripts.map(script => (
                        <tr key={script.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{script.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{script.path}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={script.status || 'pending'} />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{script.duration || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Target Hosts */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Target Hosts</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">IP Address</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Environment</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {deployment.hosts.map(host => (
                        <tr key={host.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{host.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{host.ip}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{host.environment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'logs' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Deployment Logs</h3>
                <button className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm flex items-center text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <Download size={14} className="mr-1" />
                  Download Logs
                </button>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4 font-mono text-sm overflow-auto max-h-[500px]">
                {deployment.logs.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No logs available</p>
                ) : (
                  <div className="space-y-1">
                    {deployment.logs.map(log => renderLogEntry(log))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'results' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Deployment Results</h3>
                <button className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm flex items-center text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <Download size={14} className="mr-1" />
                  Download Report
                </button>
              </div>
              
              {deployment.status === 'pending' || deployment.status === 'in_progress' ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-md p-4 text-center">
                  <p className="text-yellow-600 dark:text-yellow-400">
                    Deployment is still in progress. Results will be available once completed.
                  </p>
                </div>
              ) : deployment.status === 'failed' ? (
                <div>
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md p-4 mb-4">
                    <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">Deployment Failed</h4>
                    <p className="text-red-600 dark:text-red-400">
                      The deployment failed during execution of <strong>{deployment.scripts.find(s => s.status === 'failed')?.name}</strong>.
                      Please check the logs for more details.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4">
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Summary</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      <li>Started: {formatDetailedDate(deployment.startTime)}</li>
                      <li>Failed: {formatDetailedDate(deployment.endTime)}</li>
                      <li>
                        Scripts: {deployment.scripts.filter(s => s.status === 'success').length} successful,
                        {' '}{deployment.scripts.filter(s => s.status === 'failed').length} failed,
                        {' '}{deployment.scripts.filter(s => s.status === 'pending').length} not executed
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md p-4 mb-4">
                    <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">Deployment Successful</h4>
                    <p className="text-green-600 dark:text-green-400">
                      All scripts were executed successfully on the target hosts.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4">
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Summary</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      <li>Started: {formatDetailedDate(deployment.startTime)}</li>
                      <li>Completed: {formatDetailedDate(deployment.endTime)}</li>
                      <li>
                        Scripts: {deployment.scripts.length} executed successfully
                      </li>
                      <li>
                        Total Duration: {calculateDuration(deployment.startTime, deployment.endTime)}
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Modal Footer */}
        <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end">
          <button
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeploymentDetailsModal; 