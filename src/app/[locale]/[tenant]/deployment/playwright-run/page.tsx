import React from 'react';
import { usePlaywrightStream } from '@/hooks/usePlaywrightStream';

interface PlaywrightRunProps {
  params: {
    locale: string;
    tenant: string;
  };
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

export default function PlaywrightRun({ params, searchParams }: PlaywrightRunProps) {
  const {
    jobId,
    configName,
    env,
    hostName,
    hostIp,
    hostPort,
    repository,
    scriptFolder,
    startTime,
    websocketUrl,
  } = searchParams;

  const { streamImage, connectionStatus } = usePlaywrightStream(websocketUrl || '');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Playwright Run: {configName || 'N/A'}</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p>
            <strong>Job ID:</strong> {jobId || 'N/A'}
          </p>
          <p>
            <strong>Configuration Name:</strong> {configName || 'N/A'}
          </p>
          <p>
            <strong>Environment:</strong> {env || 'N/A'}
          </p>
          <p>
            <strong>Host Name:</strong> {hostName || 'N/A'}
          </p>
          <p>
            <strong>Host IP:</strong> {hostIp || 'N/A'}
          </p>
          <p>
            <strong>Host Port:</strong> {hostPort || 'N/A'}
          </p>
          <p>
            <strong>Repository:</strong> {repository || 'N/A'}
          </p>
          <p>
            <strong>Script Folder:</strong> {scriptFolder || 'N/A'}
          </p>
          <p>
            <strong>Start Time:</strong> {startTime || 'N/A'}
          </p>
          <p>
            <strong>End Time:</strong> N/A
          </p>
        </div>
        <div>
          <p>
            <strong>Current Script Running:</strong> N/A
          </p>
          <p>
            <strong>Connection Status:</strong> {connectionStatus}
          </p>
        </div>
      </div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Streamed View</h2>
        {streamImage ? (
          <img src={streamImage} alt="Playwright Stream" className="w-full h-auto border rounded" />
        ) : (
          <div className="w-full h-64 bg-gray-200 flex items-center justify-center border rounded">
            <p>No stream available</p>
          </div>
        )}
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Logs</h2>
        <div className="w-full h-32 bg-gray-100 border rounded p-2 overflow-auto">
          {/* Logs will be implemented later */}
          <p>Logs will be displayed here.</p>
        </div>
      </div>
    </div>
  );
}
