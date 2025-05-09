import React from 'react';

import PlaywrightContentClient from './client/playwrightContentClient';

interface PlaywrightContentProps {
  searchParams: {
    jobId?: string;
    configName?: string;
    env?: string;
    hostName?: string;
    hostIp?: string;
    hostPort?: string;
    repository?: string;
    scriptFolder?: string;
    startTime?: string;
    websocketUrl?: string;
  };
}

export default function PlaywrightContent({ searchParams }: PlaywrightContentProps) {
  const unwrappedSearchParams = React.use(searchParams);
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Playwright Run: {unwrappedSearchParams.configName || 'N/A'}
      </h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p>
            <strong>Job ID:</strong> {unwrappedSearchParams.jobId || 'N/A'}
          </p>
          <p>
            <strong>Configuration Name:</strong> {unwrappedSearchParams.configName || 'N/A'}
          </p>
          <p>
            <strong>Environment:</strong> {unwrappedSearchParams.env || 'N/A'}
          </p>
          <p>
            <strong>Host Name:</strong> {unwrappedSearchParams.hostName || 'N/A'}
          </p>
          <p>
            <strong>Host IP:</strong> {unwrappedSearchParams.hostIp || 'N/A'}
          </p>
          <p>
            <strong>Host Port:</strong> {unwrappedSearchParams.hostPort || 'N/A'}
          </p>
          <p>
            <strong>Repository:</strong> {unwrappedSearchParams.repository || 'N/A'}
          </p>
          <p>
            <strong>Script Folder:</strong> {unwrappedSearchParams.scriptFolder || 'N/A'}
          </p>
          <p>
            <strong>Start Time:</strong> {unwrappedSearchParams.startTime || 'N/A'}
          </p>
          <p>
            <strong>End Time:</strong> N/A
          </p>
        </div>
        <div>
          <p>
            <strong>Current Script Running:</strong> N/A
          </p>
          {/* Connection Status will be handled by the client component */}
        </div>
      </div>
      <PlaywrightContentClient websocketUrl={unwrappedSearchParams.websocketUrl || ''} />
    </div>
  );
}
