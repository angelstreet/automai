'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Host } from '@/types/component/hostComponentType';

interface RecVncViewerProps {
  host: Host;
  onClose?: () => void;
}

/**
 * Fullscreen VNC viewer component using an iframe approach
 */
export function RecVncViewer({ host, onClose }: RecVncViewerProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for dedicated VNC fields only
  const vnc_port = (host as any).vnc_port;
  const vnc_password = (host as any).vnc_password;

  // Check if VNC connection is possible
  const canConnectVnc = !!vnc_port && !!vnc_password;

  // Handle missing VNC fields
  useEffect(() => {
    if (!canConnectVnc) {
      setIsConnecting(false);
      setError('VNC connection not available for this host.');
    }
  }, [canConnectVnc]);

  // Generate VNC page URL
  const vncPageUrl = canConnectVnc
    ? `/api/vnc-page?host=${encodeURIComponent(host.ip)}&port=${
        vnc_port
      }&password=${encodeURIComponent(vnc_password)}&viewOnly=false`
    : '';

  // Handle messages from iframe
  useEffect(() => {
    if (!canConnectVnc) return;

    const handleMessage = (event: MessageEvent) => {
      switch (event.data) {
        case 'connected':
          setIsConnecting(false);
          setError(null);
          console.log('[@component:RecVncViewer] Connected to VNC server');
          break;
        case 'disconnected':
          setError('Disconnected from VNC server');
          console.log('[@component:RecVncViewer] Disconnected from VNC server');
          break;
        case 'auth-failed':
          setError('Invalid VNC password');
          setIsConnecting(false);
          console.log('[@component:RecVncViewer] Authentication failed');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [canConnectVnc]);

  // Handle connection timeout
  useEffect(() => {
    if (!canConnectVnc) return;

    const timeoutId = setTimeout(() => {
      if (isConnecting) {
        setIsConnecting(false);
        setError('Connection timed out. Please check if the VNC server is running on the host.');
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [isConnecting, canConnectVnc]);

  // Handle close button
  const handleClose = useCallback(() => {
    if (canConnectVnc && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage('disconnect', '*');
    }
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [onClose, router, canConnectVnc]);

  // Keyboard shortcuts (ESC to exit fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="p-2 bg-gray-900 flex items-center justify-between">
        <div className="text-white">
          <span className="font-semibold">{host.name}</span>
          <span className="ml-2 text-gray-400 text-sm">
            {host.ip}
            {vnc_port ? `:${vnc_port}` : ''}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
        >
          Close
        </button>
      </div>

      {/* VNC Content */}
      <div className="flex-1 relative">
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="mt-4 text-white">Connecting to VNC server...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
            <div className="bg-red-900 p-6 rounded-lg max-w-md text-center">
              <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
              <p className="text-red-200 mb-4">{error}</p>
              <button
                onClick={handleClose}
                className="bg-white text-red-900 px-4 py-2 rounded-md font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* VNC iframe - only shown if connection is possible */}
        {canConnectVnc && (
          <iframe
            ref={iframeRef}
            src={vncPageUrl}
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </div>
  );
}
