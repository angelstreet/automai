'use client';

import { Suspense } from 'react';

import { Host } from '@/types/component/hostComponentType';

import { RecEvents } from './RecEventListener';
import { RecStreamPreview } from './RecStreamPreview';
import { RecUsbAdbStream } from './RecUsbAdbStream';
import { RecVncPreview } from './RecVncPreview';

interface RecVncPreviewGridProps {
  hosts: Host[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Grid component to display multiple VNC previews
 */
export function RecVncPreviewGrid({ hosts, isLoading, error }: RecVncPreviewGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <span className="mt-4 text-gray-500">Loading VNC hosts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-100 dark:bg-red-900 p-4 rounded-md text-red-800 dark:text-red-100">
          <p className="font-medium">Error loading hosts</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Filter hosts that have VNC configured (have vnc_port)
  const vnc_hosts = hosts.filter((host) => host.vnc_port);

  // Get first available SSH host for streaming server
  const streamHost =
    hosts.find((host) => host.type === 'ssh' && host.status === 'connected') ||
    hosts.find((host) => host.type === 'ssh');
  const streamHostId = streamHost?.id;
  const streamHostIp = streamHost?.ip;

  // Get first Android device for USB ADB streaming
  const androidDevice = hosts.find(
    (host) => host.type === 'device' && host.device_type?.includes('android'),
  );
  const androidDeviceId = androidDevice?.ip_local || androidDevice?.ip;
  const androidDeviceName = androidDevice?.name || 'USB Android';

  // Generate dynamic stream URL
  const streamUrl = streamHostIp
    ? `https://${streamHostIp}:444/stream/output.m3u8`
    : 'https://localhost:444/stream/output.m3u8';

  // Handle opening the stream viewer modal
  const handleOpenStreamViewer = () => {
    console.log('[@component:RecVncPreviewGrid] Stream preview clicked');

    // Create a device config for the stream
    const streamDevice = {
      id: `stream-${streamHostId || 'default'}`,
      name: 'Live Stream',
      type: 'androidTv' as const,
      streamUrl,
      remoteConfig: {
        hostId: streamHostId || '',
        deviceId: androidDeviceId || '',
      },
    };

    window.dispatchEvent(
      new CustomEvent(RecEvents.OPEN_DEVICE_VIEWER, {
        detail: { device: streamDevice },
      }),
    );
  };

  if (vnc_hosts.length === 0 && !isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Hardcoded M3U8 stream preview */}
        <RecStreamPreview
          streamUrl={streamUrl}
          title="Live Stream"
          onClick={handleOpenStreamViewer}
        />

        {/* USB ADB stream - now with dynamic data */}
        {androidDevice && streamHostId && (
          <RecUsbAdbStream
            hostId={streamHostId}
            mobileName={androidDeviceName}
            streamUrl={streamUrl}
            deviceId={androidDeviceId || ''}
          />
        )}

        <div className="flex items-center justify-center h-64 col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-3">
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-4 rounded-md text-yellow-800 dark:text-yellow-200">
            <p className="font-medium">No hosts with VNC found</p>
            <p className="text-sm">Add hosts with VNC connectivity to see them here.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* Hardcoded M3U8 stream preview */}
      <RecStreamPreview
        streamUrl={streamUrl}
        title="Live Stream"
        onClick={handleOpenStreamViewer}
      />

      {/* USB ADB stream - now with dynamic data */}
      {androidDevice && streamHostId && (
        <RecUsbAdbStream
          hostId={streamHostId}
          mobileName={androidDeviceName}
          streamUrl={streamUrl}
          deviceId={androidDeviceId || ''}
        />
      )}

      {/* VNC host previews */}
      {vnc_hosts.map((host) => (
        <Suspense key={host.id} fallback={<RecVncPreviewSkeleton />}>
          <RecVncPreview host={host} />
        </Suspense>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for VNC preview
 */
function RecVncPreviewSkeleton() {
  return (
    <div
      className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{ height: '160px' }}
    >
      <div className="h-full w-full animate-pulse bg-gray-200 dark:bg-gray-700"></div>
    </div>
  );
}
