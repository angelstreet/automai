'use client';

import React, { useState } from 'react';
import { RepositoryProvider, useRepository } from '@/context/NewRepositoryContext';
import { HostProvider, useHost } from '@/context/NewHostContext';
import { DeploymentProvider, useDeployment } from '@/context/NewDeploymentContext';
import { CICDProvider, useCICD } from '@/context/NewCICDContext';

// Component that uses multiple contexts together
function MultiContextTest() {
  const [activeTab, setActiveTab] = useState('repositories');

  // Get data from all contexts
  const repositoryContext = useRepository();
  const hostContext = useHost();
  const deploymentContext = useDeployment();
  const cicdContext = useCICD();

  // Check if any context is loading
  const isLoading =
    repositoryContext.loading ||
    hostContext.loading ||
    deploymentContext.loading ||
    cicdContext.loading;

  // Check for errors in any context
  const errors = [
    repositoryContext.error,
    hostContext.error,
    deploymentContext.error,
    cicdContext.error,
  ].filter(Boolean);

  // Function to refresh all data
  const refreshAll = async () => {
    await Promise.all([
      repositoryContext.refreshRepositories(),
      hostContext.fetchHosts(),
      deploymentContext.fetchDeployments(),
      cicdContext.fetchProviders(),
    ]);
  };

  // Handle tab switching
  const renderTabContent = () => {
    switch (activeTab) {
      case 'repositories':
        return (
          <div>
            <h2>Repositories ({repositoryContext.repositories.length})</h2>
            <button onClick={repositoryContext.refreshRepositories}>Refresh Repositories</button>
            <ul>
              {repositoryContext.repositories.map((repo) => (
                <li key={repo.id}>{repo.name}</li>
              ))}
            </ul>
          </div>
        );

      case 'hosts':
        return (
          <div>
            <h2>Hosts ({hostContext.hosts.length})</h2>
            <button onClick={hostContext.fetchHosts}>Refresh Hosts</button>
            <ul>
              {hostContext.hosts.map((host) => (
                <li key={host.id}>
                  {host.name} - {host.status}
                </li>
              ))}
            </ul>
          </div>
        );

      case 'deployments':
        return (
          <div>
            <h2>Deployments ({deploymentContext.deployments.length})</h2>
            <button onClick={deploymentContext.fetchDeployments}>Refresh Deployments</button>
            <ul>
              {deploymentContext.deployments.map((deployment) => (
                <li key={deployment.id}>
                  {deployment.name} - {deployment.status}
                </li>
              ))}
            </ul>
          </div>
        );

      case 'cicd':
        return (
          <div>
            <h2>CICD Providers ({cicdContext.providers.length})</h2>
            <button onClick={cicdContext.fetchProviders}>Refresh Providers</button>
            <ul>
              {cicdContext.providers.map((provider) => (
                <li key={provider.id}>
                  {provider.name} - {provider.type}
                </li>
              ))}
            </ul>
          </div>
        );

      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div>
      <h1>SWR Integration Test</h1>

      {isLoading && <div>Loading data...</div>}

      {errors.length > 0 && (
        <div style={{ color: 'red' }}>
          <h3>Errors:</h3>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button onClick={refreshAll}>Refresh All Data</button>
      </div>

      <div style={{ display: 'flex', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('repositories')}
          style={{ fontWeight: activeTab === 'repositories' ? 'bold' : 'normal' }}
        >
          Repositories
        </button>
        <button
          onClick={() => setActiveTab('hosts')}
          style={{ fontWeight: activeTab === 'hosts' ? 'bold' : 'normal' }}
        >
          Hosts
        </button>
        <button
          onClick={() => setActiveTab('deployments')}
          style={{ fontWeight: activeTab === 'deployments' ? 'bold' : 'normal' }}
        >
          Deployments
        </button>
        <button
          onClick={() => setActiveTab('cicd')}
          style={{ fontWeight: activeTab === 'cicd' ? 'bold' : 'normal' }}
        >
          CICD
        </button>
      </div>

      {renderTabContent()}
    </div>
  );
}

// Composite provider that wraps all new context providers
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <RepositoryProvider>
      <HostProvider>
        <DeploymentProvider>
          <CICDProvider>{children}</CICDProvider>
        </DeploymentProvider>
      </HostProvider>
    </RepositoryProvider>
  );
}

// Wrapper component with all providers
export default function TestSWRIntegration() {
  return (
    <AllProviders>
      <MultiContextTest />
    </AllProviders>
  );
}
