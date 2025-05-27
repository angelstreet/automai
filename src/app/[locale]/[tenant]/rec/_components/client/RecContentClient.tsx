'use client';

import { UnifiedHostModalContainer } from '@/components/terminal';
import { useRecHosts } from '@/hooks/useRecHosts';

import { RecEventListener } from './RecEventListener';
import { RecPreviewGrid } from './RecPreviewGrid';

/**
 * Client component for displaying and managing rec devices
 */
export function RecContentClient() {
  // Use the rec hosts hook to fetch and manage host data
  const { hosts, loading, error, refreshHosts } = useRecHosts();

  return (
    <div className="space-y-4 p-4">
      <RecPreviewGrid hosts={hosts} isLoading={loading} error={error} />

      {/* Event listener component to handle rec device events */}
      <RecEventListener />

      {/* Unified host modal container to handle VNC viewing */}
      <UnifiedHostModalContainer />
    </div>
  );
}

export default RecContentClient;
