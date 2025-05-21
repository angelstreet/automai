'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Define interface for component props
interface NoVncViewerProps {
  host: string;
  port: string | number;
  password?: string;
  viewOnly?: boolean;
  fullScreen?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

// We use dynamic import to ensure RFB is only loaded on the client side
// This is cleaner than using the iframe approach
const NoVncViewerClient = ({
  host,
  port,
  password = '',
  viewOnly = false,
  fullScreen = false,
  onConnect,
  onDisconnect,
  onError,
}: NoVncViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(
    'connecting',
  );
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Dynamic import wrapped in a self-executing async function to handle top-level await
    (async () => {
      try {
        // Import RFB directly from specific file to avoid browser.js with top-level await
        // We're specifically targeting the RFB module to avoid importing files with top-level await
        const { RFB } = await import('@novnc/novnc/lib/rfb.js');

        if (!RFB) {
          throw new Error('Failed to load RFB from noVNC');
        }

        if (!containerRef.current) {
          throw new Error('Container reference not available');
        }

        // Clean up any existing connection
        if (rfbRef.current) {
          rfbRef.current.disconnect();
          rfbRef.current = null;
        }

        console.log('[@vnc:NoVncViewer] Connecting to VNC server', { host, port });

        // Create WebSocket URL
        const wsUrl = `ws://${window.location.hostname}:${window.location.port}/vnc?vnc_host=${encodeURIComponent(host)}&vnc_port=${port}`;

        // Initialize RFB connection
        rfbRef.current = new RFB(containerRef.current, {
          encrypt: window.location.protocol === 'https:',
          credentials: { password },
          viewOnly,
          shared: true,
          qualityLevel: 6,
          compressionLevel: 2,
        });

        rfbRef.current.connect(wsUrl);

        // Set up event listeners
        rfbRef.current.addEventListener('connect', () => {
          console.log('[@vnc:NoVncViewer] Connected to VNC server');
          setStatus('connected');
          onConnect?.();
        });

        rfbRef.current.addEventListener('disconnect', (e: any) => {
          console.log(
            '[@vnc:NoVncViewer] Disconnected from VNC server',
            e.detail?.reason || 'unknown',
          );
          setStatus('disconnected');
          onDisconnect?.();
        });

        rfbRef.current.addEventListener('credentialsrequired', () => {
          console.error('[@vnc:NoVncViewer] Authentication failed');
          setStatus('error');
          setErrorMessage('Authentication failed');
          onError?.('Authentication failed');
        });
      } catch (error) {
        console.error('[@vnc:NoVncViewer] Error initializing VNC connection:', error);
        setStatus('error');
        const message = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(message);
        onError?.(message);
      }
    })();

    // Cleanup on unmount
    return () => {
      if (rfbRef.current) {
        console.log('[@vnc:NoVncViewer] Disconnecting VNC on cleanup');
        try {
          rfbRef.current.disconnect();
        } catch (e) {
          console.error('[@vnc:NoVncViewer] Error disconnecting:', e);
        }
        rfbRef.current = null;
      }
    };
  }, [host, port, password, viewOnly, onConnect, onDisconnect, onError]);

  return (
    <div className="relative w-full h-full">
      {/* Status indicators */}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="mt-2 text-xs text-gray-500">
              Connecting to {host}:{port}...
            </span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center p-4 text-center">
            <span className="text-red-500 text-sm">Connection Error</span>
            <span className="text-xs text-gray-500 mt-1">
              {host}:{port}
            </span>
            {errorMessage && <span className="text-xs text-red-400 mt-1">{errorMessage}</span>}
          </div>
        </div>
      )}

      {/* VNC canvas container */}
      <div
        ref={containerRef}
        className={`w-full ${fullScreen ? 'h-screen' : 'h-full'} ${status !== 'connected' ? 'invisible' : ''}`}
      />
    </div>
  );
};

// Use dynamic import with ssr: false to ensure this component only loads on the client
const NoVncViewer = dynamic(() => Promise.resolve(NoVncViewerClient), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export default NoVncViewer;
