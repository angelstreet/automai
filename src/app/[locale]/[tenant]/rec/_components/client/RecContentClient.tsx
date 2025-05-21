'use client';

import { useRecHosts } from '@/hooks/useRecHosts';

import { RecEventListener } from './RecEventListener';
import { RecVncPreviewGrid } from './RecVncPreviewGrid';

/**
 * Client component for displaying and managing rec
 */
export function RecContentClient() {
  // Use the rec hosts hook to fetch and manage host data
  const { hosts, loading, error, refreshHosts } = useRecHosts();

  return (
    <div className="space-y-4 p-4">
      <RecVncPreviewGrid hosts={hosts} isLoading={loading} error={error} />

      {/* Event listener component to handle rec/VNC events */}
      <RecEventListener />
    </div>
  );
}

export default RecContentClient;
