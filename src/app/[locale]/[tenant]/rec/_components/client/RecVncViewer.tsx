'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Host } from '@/types/component/hostComponentType';

interface RecVncViewerProps {
  host: Host;
  onClose?: () => void;
}

/**
 * Fullscreen VNC viewer component
 * This is a placeholder implementation that would need to be replaced with
 * an actual VNC client library like noVNC
 */
export function RecVncViewer({ host, onClose }: RecVncViewerProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The URL for the actual VNC connection
  // This would need to be adjusted based on your actual VNC implementation
  const vncUrl = `http://${host.ip}:${host.port || 5900}/vnc.html?autoconnect=true&password=${encodeURIComponent(host.password || '')}`;

  // Handle connection timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isConnecting) {
        setIsConnecting(false);
        setError('Connection timed out. Please check if the VNC server is running on the host.');
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeoutId);
  }, [isConnecting]);

  // Handle iframe load event
  const handleIframeLoad = useCallback(() => {
    setIsConnecting(false);
  }, []);

  // Handle iframe error
  const handleIframeError = useCallback(() => {
    setIsConnecting(false);
    setError('Failed to connect to VNC server. Please check your connection settings.');
  }, []);

  // Handle close button
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [onClose, router]);

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
            {host.ip}:{host.port || 5900}
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

        {/* This is a placeholder for the actual VNC client implementation */}
        {/* In a real implementation, this would be replaced with a proper VNC client library */}
        <div className="h-full w-full flex items-center justify-center bg-gray-800">
          <div className="text-gray-400 text-center p-6">
            <p className="mb-4">VNC Viewer would be implemented here</p>
            <p className="text-sm">
              In a production environment, this would integrate with a VNC client library such as
              noVNC to provide a real-time remote connection.
            </p>
          </div>

          {/* The iframe would be used if you have a web-based VNC client like noVNC */}
          {/* Uncomment this when you have an actual VNC implementation */}
          {/* 
          <iframe
            ref={iframeRef}
            src={vncUrl}
            className="h-full w-full border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            allow="fullscreen"
          />
          */}
        </div>
      </div>
    </div>
  );
}
