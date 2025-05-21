'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState, useRef } from 'react';

import { Host } from '@/types/component/hostComponentType';

interface RecVncPreviewProps {
  host: Host;
}

export function RecVncPreview({ host }: RecVncPreviewProps) {
  // Check for dedicated VNC fields only
  const vnc_port = (host as any).vnc_port;
  const vnc_password = (host as any).vnc_password;

  // If either VNC field is missing, don't show anything
  if (!vnc_port || !vnc_password) {
    return null;
  }

  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate VNC page URL with dedicated VNC fields
  const vncPageUrl = `/api/vnc-page?host=${encodeURIComponent(host.ip)}&port=${
    vnc_port
  }&password=${encodeURIComponent(vnc_password)}&viewOnly=true`;

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      switch (event.data) {
        case 'connected':
          setIsLoading(false);
          setHasError(false);
          break;
        case 'disconnected':
        case 'auth-failed':
          setHasError(true);
          setIsLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle double click to open the fullscreen view
  const handleDoubleClick = useCallback(() => {
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
              {host.ip}:{vnc_port}
            </span>
          </div>
        )}

        {!isLoading && !hasError && (
          <iframe
            ref={iframeRef}
            src={vncPageUrl}
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }} // View-only for preview
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 text-white p-1 text-xs">
        <div className="truncate font-semibold text-center">
          {host.ip}:{vnc_port}
        </div>
      </div>
    </div>
  );
}
