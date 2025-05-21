'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface NoVncViewerFallbackProps {
  host: string;
  port: string | number;
  password?: string;
  viewOnly?: boolean;
  fullScreen?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

// This component uses a CDN-loaded version of noVNC to avoid module issues
export default function NoVncViewerFallback({
  host,
  port,
  password = '',
  viewOnly = false,
  fullScreen = false,
  onConnect,
  onDisconnect,
  onError,
}: NoVncViewerFallbackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    'loading' | 'connecting' | 'connected' | 'disconnected' | 'error'
  >('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const rfbRef = useRef<any>(null);

  // Initialize noVNC after the script has loaded
  useEffect(() => {
    if (!scriptsLoaded || !containerRef.current) return;

    setStatus('connecting');

    try {
      // Access the global noVNC RFB class
      const RFB = (window as any).RFB;

      if (!RFB) {
        throw new Error('noVNC RFB not available');
      }

      // Disconnect any existing connection
      if (rfbRef.current) {
        try {
          rfbRef.current.disconnect();
        } catch (e) {
          console.error('Error disconnecting previous session:', e);
        }
        rfbRef.current = null;
      }

      // Create WebSocket URL
      const wsUrl = `ws://${window.location.hostname}:${window.location.port}/vnc?vnc_host=${encodeURIComponent(host)}&vnc_port=${port}`;

      console.log('[@vnc:NoVncViewerFallback] Connecting to', wsUrl);

      // Create new RFB connection
      rfbRef.current = new RFB(containerRef.current, {
        encrypt: window.location.protocol === 'https:',
        credentials: { password },
        viewOnly: !!viewOnly,
        shared: true,
        qualityLevel: 6,
        compressionLevel: 2,
      });

      // Connect to VNC server
      rfbRef.current.connect(wsUrl);

      // Set up event listeners
      rfbRef.current.addEventListener('connect', () => {
        console.log('[@vnc:NoVncViewerFallback] Connected to VNC server');
        setStatus('connected');
        onConnect?.();
      });

      rfbRef.current.addEventListener('disconnect', (e: any) => {
        console.log(
          '[@vnc:NoVncViewerFallback] Disconnected from VNC server',
          e.detail?.reason || 'unknown',
        );
        setStatus('disconnected');
        onDisconnect?.();
      });

      rfbRef.current.addEventListener('credentialsrequired', () => {
        console.error('[@vnc:NoVncViewerFallback] Authentication failed');
        setStatus('error');
        setErrorMessage('Authentication failed');
        onError?.('Authentication failed');
      });
    } catch (error) {
      console.error('[@vnc:NoVncViewerFallback] Error initializing VNC connection:', error);
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      onError?.(message);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (rfbRef.current) {
        console.log('[@vnc:NoVncViewerFallback] Disconnecting VNC on cleanup');
        try {
          rfbRef.current.disconnect();
        } catch (e) {
          console.error('[@vnc:NoVncViewerFallback] Error disconnecting:', e);
        }
        rfbRef.current = null;
      }
    };
  }, [host, port, password, viewOnly, scriptsLoaded, onConnect, onDisconnect, onError]);

  return (
    <div className="relative w-full h-full">
      {/* Load noVNC script from CDN */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/dist/vnc.min.js"
        onLoad={() => setScriptsLoaded(true)}
        onError={() => {
          setStatus('error');
          setErrorMessage('Failed to load noVNC script');
          onError?.('Failed to load noVNC script');
        }}
      />

      {/* Status indicators */}
      {(status === 'loading' || status === 'connecting') && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="mt-2 text-xs text-gray-500">
              {status === 'loading' ? 'Loading noVNC...' : `Connecting to ${host}:${port}...`}
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
}
