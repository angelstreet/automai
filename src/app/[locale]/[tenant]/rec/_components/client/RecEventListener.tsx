'use client';

import { useEffect, useState } from 'react';

import { Host } from '@/types/component/hostComponentType';

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
 * - Host devices (VNC): Routes to unified modal via OPEN_HOST_MODAL
 * - Android devices: Uses RecDeviceModal for HLS streaming and remote control
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

        // Handle host devices differently - use unified modal
        if (device.type === 'host') {
          console.log(
            `[@component:RecEventListener] Host device detected, routing to unified modal: ${device.name}`,
          );

          // Convert DeviceConfig back to Host object for unified modal
          const hostObject: Host = {
            id: device.id.replace('vnc-', ''), // Remove the 'vnc-' prefix added in RecPreviewGrid
            name: device.name,
            ip: device.vncConfig.ip,
            vnc_port: device.vncConfig.port,
            vnc_password: device.vncConfig.password,
            type: 'ssh', // Host devices in rec are SSH hosts with VNC
            device_type: 'server', // Default to server for SSH hosts
            status: 'connected', // Assume connected since they're showing in rec
            port: 22, // Default SSH port
            username: '', // Not needed for VNC-only viewing
            password: '', // Not needed for VNC-only viewing
            private_key: '', // Not needed for VNC-only viewing
            team_id: '', // Will be filled by the actual host data
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Dispatch event to open unified host modal with VNC default
          window.dispatchEvent(
            new CustomEvent('OPEN_HOST_MODAL', {
              detail: {
                host: hostObject,
                title: `${device.name} - VNC Viewer`,
                defaultTab: 'vnc',
              },
            }),
          );
          return;
        }

        // Handle Android devices with existing modal
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

  // Only render RecDeviceModal for Android devices
  // Host devices are handled by the unified modal via event dispatch
  return (
    <>
      {currentDevice && currentDevice.type !== 'host' && (
        <RecDeviceModal device={currentDevice} isOpen={isModalOpen} onClose={handleCloseModal} />
      )}
    </>
  );
}
