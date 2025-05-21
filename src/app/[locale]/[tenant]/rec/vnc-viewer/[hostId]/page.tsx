'use client';

import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getHostById } from '@/app/actions/hostsAction';
import { RecVncViewer } from '../../../_components/client/RecVncViewer';
import { Host } from '@/types/component/hostComponentType';

/**
 * Fullscreen VNC viewer page for a specific host
 */
export default function VNCViewerPage() {
  const params = useParams();
  const hostId = params.hostId as string;

  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHost() {
      try {
        setLoading(true);
        setError(null);

        if (!hostId) {
          setError('No host ID provided');
          setLoading(false);
          return;
        }

        const result = await getHostById(hostId);

        if (result.success && result.data) {
          setHost(result.data);
        } else {
          setError(result.error || 'Failed to fetch host');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchHost();
  }, [hostId]);

  // Show 404 if host not found
  if (!loading && !host && !error) {
    notFound();
  }

  // Show loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="mt-4 text-white">Loading VNC viewer...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="bg-red-900 p-6 rounded-lg max-w-md text-center">
          <h3 className="text-xl font-bold text-white mb-2">Error</h3>
          <p className="text-red-200 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="bg-white text-red-900 px-4 py-2 rounded-md font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Show VNC viewer
  if (host) {
    return <RecVncViewer host={host} onClose={() => window.close()} />;
  }

  return null;
}
