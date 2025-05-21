'use client';

import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import { useEffect, useState, useRef } from 'react';

export function RecVncPreview({ host }) {
  const vnc_port = host?.vnc_port;
  const vnc_password = host?.vnc_password;

  if (!vnc_port || !vnc_password) {
    console.log('[@component:RecVncPreview] Missing VNC fields');
    return null;
  }

  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorReason, setErrorReason] = useState('');
  const iframeRef = useRef(null);

  useEffect(() => {
    const fetchVncPage = async () => {
      try {
        const response = await fetch('/api/vnc-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: host.ip,
            port: vnc_port,
            password: vnc_password,
            viewOnly: true,
          }),
        });
        const html = await response.text();
        if (iframeRef.current) {
          iframeRef.current.srcdoc = html;
        }
      } catch (error) {
        console.error('[@component:RecVncPreview] Failed to load VNC page:', error);
        setHasError(true);
        setErrorReason('Failed to load VNC page');
        setIsLoading(false);
      }
    };

    fetchVncPage();
  }, [host.ip, vnc_port, vnc_password]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'debug') {
        console.log('[VNC] Debug:', event.data.message);
        if (event.data.message.includes('ERROR')) {
          setErrorReason(event.data.message.replace('ERROR:', '').trim());
        }
        return;
      }

      switch (event.data) {
        case 'connected':
          setIsLoading(false);
          setHasError(false);
          break;
        case 'disconnected':
        case 'auth-failed':
        case 'error':
          setIsLoading(false);
          setHasError(true);
          setErrorReason(
            event.data === 'auth-failed' ? 'Authentication failed' : 'Connection error',
          );
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleReload = () => {
    setIsLoading(true);
    setHasError(false);
    setErrorReason('');
    fetch('/api/vnc-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: host.ip,
        port: vnc_port,
        password: vnc_password,
        viewOnly: true,
      }),
    })
      .then((res) => res.text())
      .then((html) => {
        if (iframeRef.current) {
          iframeRef.current.srcdoc = html;
        }
      });
  };

  const handleDoubleClick = () => {
    const locale = params.locale;
    const tenant = params.tenant;
    if (locale && tenant) {
      window.open(`/${locale}/${tenant}/rec/vnc-viewer/${host.id}`, '_blank');
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
      style={{ height: '160px' }}
      onDoubleClick={handleDoubleClick}
    >
      <button
        className="absolute top-0 right-0 z-10 bg-black p-1 text-white text-xs opacity-30 hover:opacity-100"
        onClick={handleReload}
      >
        Reload
      </button>

      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        {isLoading && (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="mt-2 text-xs text-gray-500">Loading...</span>
          </div>
        )}

        {hasError && (
          <div className="flex flex-col items-center p-4 text-center">
            <span className="text-red-500 text-sm">Connection Error</span>
            <span className="text-xs text-gray-500 mt-1">
              {host.ip}:{vnc_port}
            </span>
            {errorReason && <span className="text-xs text-red-400 mt-1">{errorReason}</span>}
            <button
              className="text-xs mt-2 px-2 py-1 bg-blue-500 text-white rounded"
              onClick={handleReload}
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !hasError && (
          <iframe
            ref={iframeRef}
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
            sandbox="allow-scripts"
          />
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 text-white p-1 text-xs text-center">
        {host.ip}:{vnc_port}
      </div>
    </div>
  );
}

RecVncPreview.propTypes = {
  host: PropTypes.shape({
    ip: PropTypes.string,
    id: PropTypes.string,
    vnc_port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    vnc_password: PropTypes.string,
  }).isRequired,
};
