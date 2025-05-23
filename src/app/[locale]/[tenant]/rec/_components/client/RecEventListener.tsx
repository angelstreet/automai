'use client';

import { useEffect, useState } from 'react';

import { DeviceConfig } from '../types/recDeviceTypes';
import { RecDeviceModal } from './RecDeviceModal';

/**
 * Event constants for Rec feature
 */
export const RecEvents = {
  // Device Control Events
  OPEN_DEVICE_VIEWER: 'OPEN_DEVICE_VIEWER',
  CLOSE_DEVICE_VIEWER: 'CLOSE_DEVICE_VIEWER',

  // Data Refresh Events
  REFRESH_REC_DEVICES: 'REFRESH_REC_DEVICES',
} as const;

/**
 * Event listener component for Rec feature
 * Handles events related to device viewing and rec functionality
 */
export function RecEventListener() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<DeviceConfig | null>(null);

  useEffect(() => {
    console.log('[@component:RecEventListener] Initializing event listeners');

    // Handler for opening device viewer
    const handleOpenDeviceViewer = (event: CustomEvent) => {
      const { device } = event.detail;
      if (device) {
        console.log(
          `[@component:RecEventListener] Opening device modal for: ${device.name} (${device.type})`,
        );
        setCurrentDevice(device);
        setIsModalOpen(true);
      } else {
        console.error('[@component:RecEventListener] Missing device data for viewer');
      }
    };

    // Handler for closing device viewer
    const handleCloseDeviceViewer = () => {
      console.log('[@component:RecEventListener] Closing device modal');
      setIsModalOpen(false);
      setCurrentDevice(null);
    };

    // Handler for refreshing rec devices
    const handleRefreshRecDevices = () => {
      console.log('[@component:RecEventListener] Refreshing rec devices');
      // Dispatch a devices updated event to trigger refetch in hooks
      window.dispatchEvent(new Event('DEVICES_UPDATED'));
    };

    // Register event listeners with TypeScript cast for CustomEvent
    window.addEventListener(RecEvents.OPEN_DEVICE_VIEWER, handleOpenDeviceViewer as EventListener);
    window.addEventListener(
      RecEvents.CLOSE_DEVICE_VIEWER,
      handleCloseDeviceViewer as EventListener,
    );
    window.addEventListener(
      RecEvents.REFRESH_REC_DEVICES,
      handleRefreshRecDevices as EventListener,
    );

    // Cleanup function to remove event listeners when component unmounts
    return () => {
      console.log('[@component:RecEventListener] Cleaning up event listeners');
      window.removeEventListener(
        RecEvents.OPEN_DEVICE_VIEWER,
        handleOpenDeviceViewer as EventListener,
      );
      window.removeEventListener(
        RecEvents.CLOSE_DEVICE_VIEWER,
        handleCloseDeviceViewer as EventListener,
      );
      window.removeEventListener(
        RecEvents.REFRESH_REC_DEVICES,
        handleRefreshRecDevices as EventListener,
      );
    };
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentDevice(null);
  };

  return <RecDeviceModal device={currentDevice} isOpen={isModalOpen} onClose={handleCloseModal} />;
}
