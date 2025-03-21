'use client';

import React, { useState } from 'react';
import { useHost, useDeployment, useRepository } from '@/context';

/**
 * Example component demonstrating the recommended way to use the centralized context system.
 * This approach should be used throughout the application for all state management needs.
 * 
 * Key principles:
 * - Import hooks from '@/context'
 * - Use the hooks to access state and actions
 * - No need for context providers (they're in the root layout)
 */
export function ContextDemo() {
  const [activeTab, setActiveTab] = useState<'hosts' | 'deployments' | 'repos'>('hosts');
  
  // Access multiple contexts through convenience hooks
  const { hosts, loading: hostsLoading, error: hostsError, fetchHosts } = useHost();
  const { deployments, loading: deploymentsLoading, error: deploymentsError, fetchDeployments } = useDeployment();
  const { repositories, loading: reposLoading, error: reposError, fetchRepositories } = useRepository();

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Context System Demo</h2>
      
      <div className="flex space-x-2 mb-4">
        <button 
          className={`px-3 py-2 rounded ${activeTab === 'hosts' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('hosts')}
        >
          Hosts
        </button>
        <button 
          className={`px-3 py-2 rounded ${activeTab === 'deployments' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('deployments')}
        >
          Deployments
        </button>
        <button 
          className={`px-3 py-2 rounded ${activeTab === 'repos' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('repos')}
        >
          Repositories
        </button>
      </div>
      
      <div className="mb-4">
        {activeTab === 'hosts' && (
          <button 
            className="px-3 py-1 bg-green-500 text-white rounded text-sm"
            onClick={() => fetchHosts()}
          >
            Refresh Hosts
          </button>
        )}
        {activeTab === 'deployments' && (
          <button 
            className="px-3 py-1 bg-green-500 text-white rounded text-sm"
            onClick={() => fetchDeployments()}
          >
            Refresh Deployments
          </button>
        )}
        {activeTab === 'repos' && (
          <button 
            className="px-3 py-1 bg-green-500 text-white rounded text-sm"
            onClick={() => fetchRepositories()}
          >
            Refresh Repositories
          </button>
        )}
      </div>
      
      <div className="border rounded p-4">
        {activeTab === 'hosts' && (
          <>
            {hostsLoading ? (
              <p>Loading hosts...</p>
            ) : hostsError ? (
              <p className="text-red-500">Error: {hostsError}</p>
            ) : hosts.length === 0 ? (
              <p>No hosts found</p>
            ) : (
              <ul className="space-y-2">
                {hosts.map(host => (
                  <li key={host.id} className="p-2 border-b">
                    <div className="font-medium">{host.name}</div>
                    <div className="text-sm text-gray-500">{host.ip}</div>
                    <div className="text-xs bg-gray-100 inline-block px-2 rounded mt-1">
                      {host.status}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        
        {activeTab === 'deployments' && (
          <>
            {deploymentsLoading ? (
              <p>Loading deployments...</p>
            ) : deploymentsError ? (
              <p className="text-red-500">Error: {deploymentsError}</p>
            ) : deployments.length === 0 ? (
              <p>No deployments found</p>
            ) : (
              <ul className="space-y-2">
                {deployments.map(deployment => (
                  <li key={deployment.id} className="p-2 border-b">
                    <div className="font-medium">{deployment.name}</div>
                    <div className="text-xs bg-gray-100 inline-block px-2 rounded mt-1">
                      {deployment.status}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        
        {activeTab === 'repos' && (
          <>
            {reposLoading ? (
              <p>Loading repositories...</p>
            ) : reposError ? (
              <p className="text-red-500">Error: {reposError}</p>
            ) : repositories.length === 0 ? (
              <p>No repositories found</p>
            ) : (
              <ul className="space-y-2">
                {repositories.map(repo => (
                  <li key={repo.id} className="p-2 border-b">
                    <div className="font-medium">{repo.name}</div>
                    <div className="text-sm text-gray-500">{repo.owner}</div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
} 