'use client';

import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';

import { Host } from '@/types/component/hostComponentType';

interface RecVncPreviewProps {
  host: Host;
}

/**
 * VNC Preview component for a single host
 * Shows a preview thumbnail that can be double-clicked to open full screen
 */
export function RecVncPreview({ host }: RecVncPreviewProps) {
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Handle double click to open the fullscreen view
  const handleDoubleClick = useCallback(() => {
    // Open in new tab
    const locale = params.locale as string;
    const tenant = params.tenant as string;
    const fullscreenUrl = `/${locale}/${tenant}/rec/vnc-viewer/${host.id}`;
    window.open(fullscreenUrl, '_blank');
  }, [host.id, params.locale, params.tenant]);

  return (
    <div
      className="relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 
                hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
      style={{ height: '160px' }}
      onDoubleClick={handleDoubleClick}
    >
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        {isLoading && (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">Loading...</span>
          </div>
        )}

        {hasError && (
          <div className="flex flex-col items-center p-4">
            <span className="text-red-500 text-sm">Connection Error</span>
            <span className="text-xs text-gray-500 mt-1">
              {host.ip}:{host.port || 5900}
            </span>
          </div>
        )}

        {/* This would be a real-time preview in production */}
        {/* For now, use a placeholder div that looks like a screen */}
        <div
          className={`absolute inset-0 ${hasError ? 'hidden' : ''}`}
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <div className="p-3 text-xs text-white">
            <div className="font-bold">{host.name}</div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-500 text-xs">Double-click to open fullscreen</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 text-white p-1 text-xs">
        <div className="truncate font-semibold text-center">
          {host.ip}:{host.port || 5900}
        </div>
      </div>
    </div>
  );
}
