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

  // Debug log connection parameters
  console.log('[@component:RecVncPreview] Connection info:', {
    host_name: host.name,
    ip: host.ip,
    vnc_port,
    has_password: !!vnc_password,
    password_preview: vnc_password ? `${vnc_password.charAt(0)}...` : 'none',
  });

  // If either VNC field is missing, don't show anything
  if (!vnc_port || !vnc_password) {
    console.log('[@component:RecVncPreview] Skipping VNC preview - missing required fields');
    return null;
  }

  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showDebug, setShowDebug] = useState(false);

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

  // Add a debug toggle button
  const toggleDebug = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger double-click handler
    setShowDebug(!showDebug);
  };

  return (
    <div
      className="relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 
                hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
      style={{ height: '160px' }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Debug toggle button */}
      <button
        className="absolute top-0 right-0 z-50 bg-black p-1 text-white text-xs opacity-30 hover:opacity-100"
        onClick={toggleDebug}
      >
        Debug
      </button>

      {/* Debug overlay */}
      {showDebug && (
        <div className="absolute inset-0 bg-black bg-opacity-80 text-white z-40 p-2 text-xs overflow-auto">
          <h4 className="font-bold">VNC Connection Info:</h4>
          <pre>
            Host: {host.ip}
            {'\n'}
            VNC Port: {vnc_port || 'none'}
            {'\n'}
            Password: {vnc_password ? `${vnc_password.charAt(0)}...` : 'none'}
            {'\n'}
          </pre>
        </div>
      )}

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
