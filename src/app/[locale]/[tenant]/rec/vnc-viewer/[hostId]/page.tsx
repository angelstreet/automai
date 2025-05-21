'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, lazy, Suspense } from 'react';

import { getHostById } from '@/app/actions/hostsAction';
import { Host } from '@/types/component/hostComponentType';
import NoVncViewerFallback from '@/components/vnc/NoVncViewerFallback';

// Host with VNC properties - extend the base Host type
interface VncHost extends Host {
  // Additional VNC properties that might be present but not in the Host type
  vnc_port?: string | number;
  vnc_password?: string;
}

/**
 * Fullscreen VNC viewer page for a specific host
 */
export default function VNCViewerPage() {
  const params = useParams();
  const hostId = params.hostId as string;

  const [host, setHost] = useState<VncHost | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    async function fetchHost() {
      if (!hostId) return;

      try {
        const result = await getHostById(hostId);
        if (result.success && result.data) {
          // Cast to VncHost to handle potential VNC properties
          setHost(result.data as VncHost);
        } else {
          setError(result.error || 'Failed to fetch host');
        }
      } catch (error) {
        console.error('[@page:vnc-viewer] Failed to fetch host:', error);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchHost();
  }, [hostId]);

  // Handle errors in the primary viewer by switching to fallback
  const handleError = () => {
    console.log('[@page:vnc-viewer] Switching to fallback VNC viewer');
    setUseFallback(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !host) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-800">
        <div className="text-center p-6 bg-white dark:bg-gray-700 rounded-lg shadow-md">
          <h1 className="text-xl font-semibold text-red-500">{error || 'Host Not Found'}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            The requested host could not be found or you don't have access to it.
          </p>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => window.close()}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Extract VNC connection details
  const vncPort = host.vnc_port || host.port || '5900';
  const vncPassword = host.vnc_password || host.password || '';

  // Show VNC viewer (use fallback by default for now)
  return (
    <div className="flex flex-col h-screen">
      <div className="p-2 bg-gray-800 text-white flex justify-between items-center">
        <h1 className="text-lg font-medium">{host.name || host.hostname || 'VNC Viewer'}</h1>
        <div className="text-sm text-gray-300">
          {host.ip}:{vncPort}
        </div>
      </div>

      <div className="flex-1 relative">
        <NoVncViewerFallback
          host={host.ip}
          port={vncPort}
          password={vncPassword}
          viewOnly={false}
          fullScreen={true}
        />
      </div>
    </div>
  );
}

// Mark as dynamic to ensure fresh data on each request
export const dynamic = 'force-dynamic';
