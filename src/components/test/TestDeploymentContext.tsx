'use client';

import React, { useEffect, useState } from 'react';
import { DeploymentProvider, useDeployment } from '@/context/NewDeploymentContext';
import type { Deployment } from '@/app/[locale]/[tenant]/deployment/types';

// Simple component to test deployment context
function DeploymentList() {
  const {
    deployments,
    repositories,
    loading,
    error,
    isRefreshing,
    fetchDeployments,
    deleteDeployment,
    refreshDeployment,
  } = useDeployment();

  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);
  const [deploymentDetails, setDeploymentDetails] = useState<Deployment | null>(null);

  useEffect(() => {
    // Load deployments when component mounts
    fetchDeployments();
  }, [fetchDeployments]);

  const handleRefreshDeployment = async (id: string) => {
    const result = await refreshDeployment(id);
    if (result.success && result.deployment) {
      setDeploymentDetails(result.deployment);
    }
  };

  const handleDeleteDeployment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this deployment?')) {
      await deleteDeployment(id);
      // Clear selected deployment if it was deleted
      if (selectedDeploymentId === id) {
        setSelectedDeploymentId(null);
        setDeploymentDetails(null);
      }
    }
  };

  const handleSelectDeployment = (deployment: Deployment) => {
    setSelectedDeploymentId(deployment.id);
    setDeploymentDetails(deployment);
  };

  if (loading) return <div>Loading deployments...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1, marginRight: '20px' }}>
        <h2>Deployments ({deployments.length})</h2>
        {isRefreshing && <div>Refreshing...</div>}
        <button onClick={() => fetchDeployments(true)}>Refresh</button>

        <ul>
          {deployments.map((deployment) => (
            <li key={deployment.id} style={{ marginBottom: '10px' }}>
              <strong>{deployment.name}</strong> - {deployment.status}
              <div>
                <button onClick={() => handleSelectDeployment(deployment)}>View Details</button>
                <button onClick={() => handleRefreshDeployment(deployment.id)}>Refresh</button>
                <button onClick={() => handleDeleteDeployment(deployment.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>

        <h3>Available Repositories ({repositories.length})</h3>
        <ul>
          {repositories.map((repo) => (
            <li key={repo.id}>{repo.name}</li>
          ))}
        </ul>
      </div>

      {deploymentDetails && (
        <div style={{ flex: 1, padding: '10px', border: '1px solid #ccc' }}>
          <h2>Deployment Details</h2>
          <div>
            <strong>ID:</strong> {deploymentDetails.id}
          </div>
          <div>
            <strong>Name:</strong> {deploymentDetails.name}
          </div>
          <div>
            <strong>Description:</strong> {deploymentDetails.description}
          </div>
          <div>
            <strong>Status:</strong> {deploymentDetails.status}
          </div>
          <div>
            <strong>Repository ID:</strong> {deploymentDetails.repositoryId}
          </div>
          <div>
            <strong>Created:</strong> {new Date(deploymentDetails.createdAt).toLocaleString()}
          </div>
          {deploymentDetails.startedAt && (
            <div>
              <strong>Started:</strong> {new Date(deploymentDetails.startedAt).toLocaleString()}
            </div>
          )}
          {deploymentDetails.completedAt && (
            <div>
              <strong>Completed:</strong> {new Date(deploymentDetails.completedAt).toLocaleString()}
            </div>
          )}

          <h3>Scripts</h3>
          <ul>
            {deploymentDetails.scriptsPath.map((script, index) => (
              <li key={index}>{script}</li>
            ))}
          </ul>

          <h3>Hosts</h3>
          <ul>
            {deploymentDetails.hostIds.map((hostId, index) => (
              <li key={index}>{hostId}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Wrapper component with provider
export default function TestDeploymentContext() {
  return (
    <DeploymentProvider>
      <DeploymentList />
    </DeploymentProvider>
  );
}
