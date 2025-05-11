'use client';
import React, { useEffect, useState } from 'react';

import { usePlaywrightStream } from '@/hooks/usePlaywrightStream';

interface PlaywrightContentClientProps {
  websocketUrl: string;
  vncStreamUrl?: string;
  sessionId?: string;
  jobId: string;
}

export default function PlaywrightContentClient({
  websocketUrl,
  vncStreamUrl = '',
  sessionId = '',
  jobId = '',
}: PlaywrightContentClientProps) {
  const [streamInfo, setStreamInfo] = useState({
    websocketUrl,
    vncStreamUrl,
    sessionId,
  });
  const { streamImage, connectionStatus } = usePlaywrightStream(
    streamInfo.websocketUrl,
    streamInfo.vncStreamUrl,
  );

  // Simulate fetching streaming data dynamically based on jobId to handle delays
  useEffect(() => {
    if (jobId && (!streamInfo.websocketUrl || !streamInfo.vncStreamUrl)) {
      // Placeholder for actual API/Supabase call to fetch streaming info
      const fetchStreamInfo = async () => {
        // Simulating a delay and fetching data (replace with actual fetch logic)
        setTimeout(() => {
          console.log(`[@client:PlaywrightContentClient] Fetching stream info for jobId: ${jobId}`);
          // This is a placeholder. Replace with actual API call to fetch from Supabase or backend
          setStreamInfo({
            websocketUrl: streamInfo.websocketUrl || '',
            vncStreamUrl: streamInfo.vncStreamUrl || '',
            sessionId: streamInfo.sessionId || '',
          });
        }, 3000); // Simulate 3-second delay for backend setup
      };
      fetchStreamInfo();
    }
  }, [jobId, streamInfo]);

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
          <p>Logs will be displayed here.</p>
          <p>
            <strong>Session ID:</strong> {streamInfo.sessionId || 'N/A'}
          </p>
          <p>
            <strong>WebSocket URL:</strong> {streamInfo.websocketUrl || 'N/A'}
          </p>
          <p>
            <strong>VNC Stream URL:</strong> {streamInfo.vncStreamUrl || 'N/A'}
          </p>
          <p>
            <strong>Job ID:</strong> {jobId || 'N/A'}
          </p>
        </div>
      </div>
    </>
  );
}
