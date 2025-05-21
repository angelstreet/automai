'use client';

import { useTranslations } from 'next-intl';

import { useRecHosts } from '@/hooks/useRecHosts';
import { RecEventListener } from './RecEventListener';
import { RecVncPreviewGrid } from './RecVncPreviewGrid';

/**
 * Client component for displaying and managing rec
 */
export function RecContentClient() {
  const t = useTranslations('common');

  // Use the rec hosts hook to fetch and manage host data
  const { hosts, loading, error, refreshHosts } = useRecHosts();

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">VNC Remote Viewers</h1>
        <button
          onClick={refreshHosts}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          {t('refresh')}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Double-click on any host to open a fullscreen VNC viewer in a new tab.
        </p>

        <RecVncPreviewGrid hosts={hosts} isLoading={loading} error={error} />
      </div>

      {/* Event listener component to handle rec/VNC events */}
      <RecEventListener />
    </div>
  );
}

export default RecContentClient;
