'use client';

import { useState } from 'react';

import { Host } from '@/types/component/hostComponentType';

import { RecEvents } from './RecEventListener';

export function RecVncPreview({ host }: { host: Host }) {
  const [isLoading, setIsLoading] = useState(true);

  // Get VNC connection details
  const vnc_port = host?.vnc_port;
  const vnc_password = host?.vnc_password;

  // Early return if VNC is not configured
  if (!vnc_port) {
    console.log('[@component:RecVncPreview] Missing VNC fields for host:', host.name);
    return (
      <div className="flex items-center justify-center h-40 bg-gray-100 dark:bg-gray-800 rounded-md">
        <p className="text-sm text-gray-500">VNC not configured</p>
      </div>
    );
  }

  // VNC URL format - adding viewOnly=1 for preview mode and password if available
  const vncUrl = `http://${host.ip}:${vnc_port}/vnc_lite.html?host=${host.ip}&port=${vnc_port}&path=websockify&encrypt=0&view_only=1${vnc_password ? `&password=${vnc_password}` : ''}`;

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Handle opening the modal via event system
  const handleOpenViewer = () => {
    window.dispatchEvent(
      new CustomEvent(RecEvents.OPEN_VNC_VIEWER, {
        detail: { host },
      }),
    );
  };

  return (
    <div
      className="relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
      style={{ height: '160px' }}
      onClick={handleOpenViewer}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="mt-2 text-xs text-gray-500">Connecting...</span>
          </div>
        </div>
      )}

      {/* VNC Stream */}
      <iframe
        src={vncUrl}
        className="w-full h-full"
        style={{ border: 'none' }}
        sandbox="allow-scripts allow-same-origin allow-forms"
        onLoad={handleIframeLoad}
      />

      {/* Transparent overlay to capture clicks */}
      <div className="absolute inset-0 z-10" aria-hidden="true" />

      {/* Host info footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 text-white p-1 text-xs z-20">
        <div className="flex justify-between items-center">
          <span>{host.name || host.ip}</span>
          <span>
            {host.ip}:{vnc_port}
          </span>
        </div>
      </div>
    </div>
  );
}
