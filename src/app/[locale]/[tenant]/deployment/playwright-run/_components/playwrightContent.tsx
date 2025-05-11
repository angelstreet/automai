import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

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
    vncStreamUrl?: string;
    sessionId?: string;
  };
}

export default async function PlaywrightContent({ searchParams }: PlaywrightContentProps) {
  const params = await searchParams;

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-4">
        <button className="mr-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" disabled>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">Playwright Run: {params.configName || 'N/A'}</h1>
      </div>

      {/* Primary Info Card - Most Important Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-lg">
              <strong>Job ID:</strong> {params.jobId || 'N/A'}
            </p>
            <p className="font-semibold">
              <strong>Configuration:</strong> {params.configName || 'N/A'}
            </p>
            <p>
              <strong>Environment:</strong> {params.env || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-lg">
              <strong>Current Script:</strong>{' '}
              <span className="text-blue-600 dark:text-blue-400">Running playwright tests</span>
            </p>
            <p>
              <strong>Start Time:</strong> {params.startTime || 'N/A'}
            </p>
            <p>
              <strong>End Time:</strong> N/A
            </p>
          </div>
        </div>
      </div>

      {params.vncStreamUrl ? (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">VNC Stream</h2>
          <iframe
            src={params.vncStreamUrl}
            width="1280"
            height="720"
            style={{ border: 'none' }}
            title="VNC Stream"
          />
        </div>
      ) : (
        <PlaywrightContentClient
          websocketUrl={params.websocketUrl || ''}
          vncStreamUrl={params.vncStreamUrl || ''}
          sessionId={params.sessionId || ''}
          jobId={params.jobId || ''}
        />
      )}

      {/* Details Accordion - Expandable section with additional details */}
      <details className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <summary className="flex items-center cursor-pointer font-medium text-lg">
          <ChevronDown className="h-5 w-5 inline mr-2 summary-closed" />
          <ChevronUp className="h-5 w-5 inline mr-2 summary-open hidden" />
          Additional Details
        </summary>
        <div className="pt-4 grid grid-cols-2 gap-4">
          <div>
            <p>
              <strong>Host Name:</strong> {params.hostName || 'N/A'}
            </p>
            <p>
              <strong>Host IP:</strong> {params.hostIp || 'N/A'}
            </p>
            <p>
              <strong>Host Port:</strong> {params.hostPort || 'N/A'}
            </p>
            <p>
              <strong>WebSocket URL:</strong> {params.websocketUrl || 'N/A'}
            </p>
          </div>
          <div>
            <p>
              <strong>Repository:</strong> {params.repository || 'N/A'}
            </p>
            <p>
              <strong>Script Folder:</strong> {params.scriptFolder || 'N/A'}
            </p>
            <p>
              <strong>VNC Stream URL:</strong> {params.vncStreamUrl || 'N/A'}
            </p>
            <p>
              <strong>Session ID:</strong> {params.sessionId || 'N/A'}
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
