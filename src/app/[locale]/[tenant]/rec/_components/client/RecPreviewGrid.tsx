'use client';

import { Suspense } from 'react';

import { Host } from '@/types/component/hostComponentType';

import { AndroidDeviceConfig, DeviceConfig, HostDeviceConfig } from '../types/recDeviceTypes';

import { RecDevicePreview } from './RecDevicePreview';
import { RecEvents } from './RecEventListener';

/**
 * Maps database device_type to internal AndroidDeviceConfig type
 */
function getAndroidDeviceType(deviceType?: string): 'androidTv' | 'androidPhone' {
  if (!deviceType) return 'androidPhone';
  
  // TV-like devices should use androidTv type
  const tvDeviceTypes = [
    'android_tv',
    'android_firetv', 
    'android_nvidia_shield',
    'tv_android'
  ];
  
  if (tvDeviceTypes.includes(deviceType)) {
    return 'androidTv';
  }
  
  // All other Android devices (phones, tablets) use androidPhone type
  return 'androidPhone';
}

interface RecPreviewGridProps {
  hosts: Host[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Unified grid component to display device previews
 * Handles AndroidTV, AndroidPhone, and Host device previews
 */
export function RecPreviewGrid({ hosts, isLoading, error }: RecPreviewGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <span className="mt-4 text-gray-500">Loading devices...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-100 dark:bg-red-900 p-4 rounded-md text-red-800 dark:text-red-100">
          <p className="font-medium">Error loading devices</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Convert hosts to device configurations
  const hostDevices: HostDeviceConfig[] = hosts
    .filter((host) => host.vnc_port && host.type !== 'device') // Only SSH hosts with VNC configured, exclude devices
    .map((host) => ({
      id: `vnc-${host.id}`, // Prefix with 'vnc-' to ensure uniqueness
      name: host.name || host.ip,
      type: 'host' as const,
      vncConfig: {
        ip: host.ip,
        port: typeof host.vnc_port === 'string' ? parseInt(host.vnc_port) : host.vnc_port!,
        password: host.vnc_password,
      },
    }));

  // Get Android devices from hosts database
  const androidDevices: AndroidDeviceConfig[] = hosts
    .filter((host) => host.type === 'device' && host.device_type?.includes('android'))
    .map((host) => {
      // Use the specified ADB host if available, otherwise find fallback
      let adbHost = null;
      let streamHostIp = host.ip;

      if (host.host_id) {
        // Use the specified ADB host
        adbHost = hosts.find((h) => h.id === host.host_id);
        if (adbHost) {
          streamHostIp = adbHost.ip;
          console.log(
            `[@component:RecPreviewGrid] Using specified ADB host: ${adbHost.name} (${adbHost.id}) for device: ${host.name}`,
          );
        } else {
          console.warn(
            `[@component:RecPreviewGrid] Specified ADB host ${host.host_id} not found for device: ${host.name}`,
          );
        }
      }

      // Fallback: Find any connected SSH host if no specific host assigned or host not found
      if (!adbHost) {
        adbHost =
          hosts.find((h) => h.type === 'ssh' && h.status === 'connected') ||
          hosts.find((h) => h.type === 'ssh');

        if (adbHost) {
          streamHostIp = adbHost.ip;
          console.warn(
            `[@component:RecPreviewGrid] Using fallback ADB host: ${adbHost.name} (${adbHost.id}) for device: ${host.name}. Consider setting host_id in device configuration.`,
          );
        } else {
          console.error(
            `[@component:RecPreviewGrid] No ADB host available for device: ${host.name}. Device will not work properly.`,
          );
        }
      }

      console.log(`[@component:RecPreviewGrid] Creating Android device from host: ${host.name}`, {
        deviceType: host.device_type,
        deviceId: host.id,
        localIp: host.ip_local,
        publicIp: host.ip,
        specifiedHostId: host.host_id,
        resolvedAdbHostId: adbHost?.id,
        resolvedAdbHostName: adbHost?.name,
        streamHostIp: streamHostIp,
        hasAdbHost: !!adbHost,
        mappedType: getAndroidDeviceType(host.device_type),
      });

      return {
        id: `android-${host.id}`, // Prefix with 'android-' to ensure uniqueness
        name: host.name,
        type: getAndroidDeviceType(host.device_type),
        streamUrl: `https://${streamHostIp}:444/stream/output.m3u8`,
        remoteConfig: adbHost
          ? {
              hostId: adbHost.id,
              deviceId: host.ip_local || host.ip, // Use local IP if available, fallback to public IP
            }
          : undefined, // Don't provide remoteConfig if no ADB host available
      };
    })
    .filter((device) => device.remoteConfig); // Only include devices that have valid ADB host configuration

  console.log(
    `[@component:RecPreviewGrid] Generated ${androidDevices.length} Android devices from hosts database`,
  );

  // Combine all devices
  const allDevices: DeviceConfig[] = [...androidDevices, ...hostDevices];

  // Handle device preview click
  const handleDeviceClick = (device: DeviceConfig) => {
    console.log(`[@component:RecPreviewGrid] Device clicked: ${device.name} (${device.type})`);
    window.dispatchEvent(
      new CustomEvent(RecEvents.OPEN_DEVICE_VIEWER, {
        detail: { device },
      }),
    );
  };

  if (allDevices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-4 rounded-md text-yellow-800 dark:text-yellow-200">
          <p className="font-medium">No devices found</p>
          <p className="text-sm">Add Android devices or hosts with VNC to see them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {allDevices.map((device) => (
        <Suspense key={device.id} fallback={<DevicePreviewSkeleton />}>
          <RecDevicePreview device={device} onClick={handleDeviceClick} />
        </Suspense>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for device preview
 */
function DevicePreviewSkeleton() {
  return (
    <div
      className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{ height: '160px' }}
    >
      <div className="h-full w-full animate-pulse bg-gray-200 dark:bg-gray-700"></div>
    </div>
  );
}
