'use client';
import React from 'react';

import { usePlaywrightStream } from '@/hooks/usePlaywrightStream';

interface PlaywrightContentClientProps {
  websocketUrl: string;
  vncStreamUrl?: string;
  sessionId?: string;
}

export default function PlaywrightContentClient({ websocketUrl, vncStreamUrl = '', sessionId = '' }: PlaywrightContentClientProps) {
  const { streamImage, connectionStatus } = usePlaywrightStream(websocketUrl, vncStreamUrl);

  return (
    <>
      <p>
        <strong>Connection Status:</strong> {connectionStatus}
      </p>
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
          <p>Logs will be displayed here. Session ID: {sessionId || 'N/A'}</p>
        </div>
      </div>
    </>
  );
}
