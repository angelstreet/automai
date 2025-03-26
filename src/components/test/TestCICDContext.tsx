'use client';

import React, { useEffect, useState } from 'react';
import { CICDProvider, useCICD } from '@/context/NewCICDContext';
import type { CICDProviderPayload, CICDProviderType } from '@/app/[locale]/[tenant]/cicd/types';

// Simple component to test CICD context
function CICDManagerTest() {
  const {
    providers,
    jobs,
    loading,
    error,
    selectedProvider,
    fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    setSelectedProvider,
    fetchJobs,
  } = useCICD();

  const [newProvider, setNewProvider] = useState<CICDProviderPayload>({
    name: 'New Provider',
    type: 'jenkins',
    url: 'https://jenkins.example.com',
    config: {
      auth_type: 'basic',
      credentials: {
        username: 'admin',
        token: 'secret-token',
      },
    },
  });

  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    // Load providers when component mounts
    fetchProviders();
  }, [fetchProviders]);

  const handleSelectProvider = (provider: CICDProviderType) => {
    setSelectedProvider(provider);
    fetchJobs(provider.id);
  };

  const handleTestProvider = async () => {
    const result = await testProvider(newProvider);
    setTestResult(result.success ? 'Connection successful' : `Connection failed: ${result.error}`);
  };

  const handleCreateProvider = async () => {
    const result = await createProvider(newProvider);
    if (result.success) {
      alert('Provider created successfully');
      fetchProviders();
    } else {
      alert(`Failed to create provider: ${result.error}`);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this provider?')) {
      const result = await deleteProvider(id);
      if (result.success) {
        alert('Provider deleted successfully');
        if (selectedProvider?.id === id) {
          setSelectedProvider(null);
        }
      } else {
        alert(`Failed to delete provider: ${result.error}`);
      }
    }
  };

  if (loading) return <div>Loading CICD data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1, marginRight: '20px' }}>
        <h2>CICD Providers ({providers.length})</h2>
        <button onClick={() => fetchProviders()}>Refresh Providers</button>

        <ul>
          {providers.map((provider) => (
            <li
              key={provider.id}
              style={{
                marginBottom: '10px',
                fontWeight: selectedProvider?.id === provider.id ? 'bold' : 'normal',
              }}
            >
              {provider.name} ({provider.type}) - {provider.url}
              <div>
                <button onClick={() => handleSelectProvider(provider)}>Select</button>
                <button onClick={() => handleDeleteProvider(provider.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>

        {selectedProvider && (
          <div>
            <h3>Selected Provider: {selectedProvider.name}</h3>
            <h4>
              Jobs for {selectedProvider.name} ({jobs.length})
            </h4>
            <button onClick={() => fetchJobs(selectedProvider.id)}>Refresh Jobs</button>
            <ul>
              {jobs.map((job) => (
                <li key={job.id}>{job.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: '10px', border: '1px solid #ccc' }}>
        <h2>Test/Create Provider</h2>
        <div>
          <label>
            Name:
            <input
              type="text"
              value={newProvider.name}
              onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
            />
          </label>
        </div>
        <div>
          <label>
            Type:
            <select
              value={newProvider.type}
              onChange={(e) => setNewProvider({ ...newProvider, type: e.target.value })}
            >
              <option value="jenkins">Jenkins</option>
              <option value="github">GitHub Actions</option>
              <option value="gitlab">GitLab CI</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            URL:
            <input
              type="text"
              value={newProvider.url}
              onChange={(e) => setNewProvider({ ...newProvider, url: e.target.value })}
            />
          </label>
        </div>
        <div>
          <button onClick={handleTestProvider}>Test Connection</button>
          <button onClick={handleCreateProvider}>Create Provider</button>
        </div>

        {testResult && (
          <div
            style={{ marginTop: '10px', color: testResult.includes('failed') ? 'red' : 'green' }}
          >
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper component with provider
export default function TestCICDContext() {
  return (
    <CICDProvider>
      <CICDManagerTest />
    </CICDProvider>
  );
}
