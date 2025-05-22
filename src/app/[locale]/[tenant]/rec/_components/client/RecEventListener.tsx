'use client';

import { useEffect, useState } from 'react';

import { Host } from '@/types/component/hostComponentType';

import { RecStreamModal } from './RecStreamModal';
import { RecVncModal } from './RecVncModal';

/**
 * Event constants for Rec feature
 */
export const RecEvents = {
  // UI Control Events
  OPEN_VNC_VIEWER: 'OPEN_VNC_VIEWER',
  CLOSE_VNC_VIEWER: 'CLOSE_VNC_VIEWER',
  OPEN_STREAM_VIEWER: 'OPEN_STREAM_VIEWER',
  CLOSE_STREAM_VIEWER: 'CLOSE_STREAM_VIEWER',

  // Data Refresh Events
  REFRESH_REC_HOSTS: 'REFRESH_REC_HOSTS',
};

/**
 * Event listener component for Rec feature
 * Handles events related to VNC viewer and rec functionality
 */
export function RecEventListener() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentHost, setCurrentHost] = useState<Host | null>(null);

  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [streamData, setStreamData] = useState<{
    streamUrl: string;
    title: string;
    hostId?: string;
    deviceId?: string;
  } | null>(null);

  useEffect(() => {
    console.log('[@component:RecEventListener] Initializing event listeners');

    // Handler for opening VNC viewer
    const handleOpenVncViewer = (event: CustomEvent) => {
      const { host } = event.detail;
      if (host) {
        console.log(`[@component:RecEventListener] Opening VNC modal for host: ${host.id}`);
        setCurrentHost(host);
        setIsModalOpen(true);
      } else {
        console.error('[@component:RecEventListener] Missing host data for VNC viewer');
      }
    };

    // Handler for closing VNC viewer
    const handleCloseVncViewer = () => {
      console.log('[@component:RecEventListener] Closing VNC modal');
      setIsModalOpen(false);
    };

    // Handler for opening stream viewer
    const handleOpenStreamViewer = (event: CustomEvent) => {
      const { streamUrl, title, hostId, deviceId } = event.detail;
      if (streamUrl) {
        console.log(`[@component:RecEventListener] Opening stream modal for: ${streamUrl}`);
        setStreamData({ streamUrl, title, hostId, deviceId });
        setIsStreamModalOpen(true);
      } else {
        console.error('[@component:RecEventListener] Missing stream URL for stream viewer');
      }
    };

    // Handler for closing stream viewer
    const handleCloseStreamViewer = () => {
      console.log('[@component:RecEventListener] Closing stream modal');
      setIsStreamModalOpen(false);
    };

    // Handler for refreshing rec hosts
    const handleRefreshRecHosts = () => {
      console.log('[@component:RecEventListener] Refreshing rec hosts');
      // Dispatch a hosts updated event to trigger refetch in useRecHosts
      window.dispatchEvent(new Event('HOSTS_UPDATED'));
    };

    // Register event listeners with TypeScript cast for CustomEvent
    window.addEventListener(RecEvents.OPEN_VNC_VIEWER, handleOpenVncViewer as EventListener);
    window.addEventListener(RecEvents.CLOSE_VNC_VIEWER, handleCloseVncViewer as EventListener);
    window.addEventListener(RecEvents.OPEN_STREAM_VIEWER, handleOpenStreamViewer as EventListener);
    window.addEventListener(
      RecEvents.CLOSE_STREAM_VIEWER,
      handleCloseStreamViewer as EventListener,
    );
    window.addEventListener(RecEvents.REFRESH_REC_HOSTS, handleRefreshRecHosts as EventListener);

    // Cleanup function to remove event listeners when component unmounts
    return () => {
      console.log('[@component:RecEventListener] Cleaning up event listeners');
      window.removeEventListener(RecEvents.OPEN_VNC_VIEWER, handleOpenVncViewer as EventListener);
      window.removeEventListener(RecEvents.CLOSE_VNC_VIEWER, handleCloseVncViewer as EventListener);
      window.removeEventListener(
        RecEvents.OPEN_STREAM_VIEWER,
        handleOpenStreamViewer as EventListener,
      );
      window.removeEventListener(
        RecEvents.CLOSE_STREAM_VIEWER,
        handleCloseStreamViewer as EventListener,
      );
      window.removeEventListener(
        RecEvents.REFRESH_REC_HOSTS,
        handleRefreshRecHosts as EventListener,
      );
    };
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCloseStreamModal = () => {
    setIsStreamModalOpen(false);
  };

  return (
    <>
      {currentHost && (
        <RecVncModal host={currentHost} isOpen={isModalOpen} onClose={handleCloseModal} />
      )}
      {streamData && (
        <RecStreamModal
          streamUrl={streamData.streamUrl}
          title={streamData.title}
          isOpen={isStreamModalOpen}
          onClose={handleCloseStreamModal}
          hostId={streamData.hostId}
          deviceId={streamData.deviceId}
        />
      )}
    </>
  );
}
