'use client';

import React from 'react';
import { RepositoryProvider, useRepository } from '@/context/NewRepositoryContext';

// Simple component to test repository context
function RepositoryList() {
  const {
    repositories,
    filteredRepositories,
    starredRepositories,
    loading,
    error,
    refreshRepositories,
    toggleStarRepository
  } = useRepository();

  if (loading) return <div>Loading repositories...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Repositories Test</h1>
      <div>
        <h2>All Repositories ({repositories.length})</h2>
        <button onClick={() => refreshRepositories()}>Refresh</button>
        <ul>
          {repositories.map(repo => (
            <li key={repo.id}>
              {repo.name}
              <button onClick={() => toggleStarRepository(repo)}>
                {starredRepositories.some(r => r.id === repo.id) ? '★' : '☆'}
              </button>
            </li>
          ))}
        </ul>
      </div>
      
      <div>
        <h2>Starred Repositories ({starredRepositories.length})</h2>
        <ul>
          {starredRepositories.map(repo => (
            <li key={repo.id}>
              {repo.name}
              <button onClick={() => toggleStarRepository(repo)}>★</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Wrapper component with provider
export default function TestRepositoryContext() {
  return (
    <RepositoryProvider>
      <RepositoryList />
    </RepositoryProvider>
  );
}