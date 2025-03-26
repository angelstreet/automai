'use client';

import React, { useState } from 'react';
import { HostProvider, useHost } from '@/context/NewHostContext';
import type { Host } from '@/app/[locale]/[tenant]/hosts/types';

// Simple component to test host context
function HostList() {
  const {
    hosts,
    filteredHosts,
    loading,
    error,
    connectionStatuses,
    fetchHosts,
    testConnection,
    selectHost,
    filterHosts,
  } = useHost();

  const [query, setQuery] = useState('');

  if (loading) return <div>Loading hosts...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleSearch = () => {
    filterHosts({ query });
  };

  const handleTestConnection = async (hostId: string) => {
    await testConnection(hostId);
  };

  return (
    <div>
      <h1>Hosts Test</h1>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search hosts..."
        />
        <button onClick={handleSearch}>Search</button>
        <button onClick={() => fetchHosts()}>Refresh</button>
      </div>

      <div>
        <h2>Hosts ({filteredHosts.length})</h2>
        <ul>
          {filteredHosts.map((host) => (
            <li key={host.id} style={{ marginBottom: '10px' }}>
              <strong>{host.name}</strong> ({host.type}) -
              {connectionStatuses[host.id] ? (
                <span
                  style={{
                    color:
                      connectionStatuses[host.id].status === 'connected'
                        ? 'green'
                        : connectionStatuses[host.id].status === 'testing'
                          ? 'orange'
                          : 'red',
                  }}
                >
                  {connectionStatuses[host.id].status}
                </span>
              ) : (
                <span>unknown</span>
              )}
              <div>
                <button onClick={() => handleTestConnection(host.id)}>Test Connection</button>
                <button onClick={() => selectHost(host)}>Select</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Wrapper component with provider
export default function TestHostContext() {
  return (
    <HostProvider>
      <HostList />
    </HostProvider>
  );
}
