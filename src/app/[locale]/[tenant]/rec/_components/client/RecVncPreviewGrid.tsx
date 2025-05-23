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

  // Get stream host ID - in a real application, this would be the actual host ID
  // that is running the stream server and has ADB access
  const streamHostId = hosts.length > 0 ? hosts[0].id : undefined;

  // Device ID of the Android device - in a real application, this would be
  // fetched from a database or config. For this example, we're using a placeholder.
  const androidDeviceId = '192.168.1.130:5555';

  // Handle opening the stream viewer modal
  const handleOpenStreamViewer = () => {
    // You can implement a custom event for handling the stream modal
    console.log('[@component:RecVncPreviewGrid] Stream preview clicked');
    window.dispatchEvent(
      new CustomEvent(RecEvents.OPEN_STREAM_VIEWER, {
        detail: {
          streamUrl: 'https://77.56.53.130:444/stream/output.m3u8',
          title: 'Live',
          hostId: streamHostId,
          deviceId: androidDeviceId,
        },
      }),
    );
  };

  if (vnc_hosts.length === 0 && !isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Hardcoded M3U8 stream preview */}
        <RecStreamPreview
          streamUrl="https://77.56.53.130:444/stream/output.m3u8"
          title="Live"
          onClick={handleOpenStreamViewer}
        />

        {/* USB ADB stream */}
        <RecUsbAdbStream hostId={streamHostId || ''} mobileName="USB Android" />

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
        streamUrl="https://77.56.53.130:444/stream/output.m3u8"
        title="Live"
        onClick={handleOpenStreamViewer}
      />

      {/* USB ADB stream */}
      <RecUsbAdbStream hostId={streamHostId || ''} mobileName="USB Android" />

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
