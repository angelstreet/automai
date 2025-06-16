import { RemoteDeviceConfig } from '../../types/controller/Remote_Types';
import { useState, useEffect, useCallback } from 'react';
import { Host } from '../../types/common/Host_Types';

// Android TV configuration - uses server route proxying to host
export const ANDROID_TV_CONFIG: RemoteDeviceConfig = {
  type: 'android-tv',
  name: 'Android TV',
  icon: 'Android',
  hasScreenshot: true,
  hasOverlay: true,
  serverEndpoints: {
    connect: '/server/control/take-control',
    disconnect: '/server/control/release-control',
    screenshot: '/server/remote/take-screenshot',
    command: '/server/remote/execute-command',
  },
};

// Android Mobile configuration - uses server route proxying to host
export const ANDROID_MOBILE_CONFIG: RemoteDeviceConfig = {
  type: 'android-mobile',
  name: 'Android Mobile',
  icon: 'PhoneAndroid',
  hasScreenshot: true,
  hasOverlay: true,
  serverEndpoints: {
    connect: '/server/control/take-control',
    disconnect: '/server/control/release-control',
    screenshot: '/server/remote/take-screenshot',
    command: '/server/remote/execute-command',
    screenshotAndDump: '/server/remote/screenshot-and-dump',
    getApps: '/server/remote/get-apps',
    clickElement: '/server/remote/click-element',
    tapElement: '/server/remote/tap-element',
  },
};

// IR Remote configuration - uses server route proxying to host
export const IR_CONFIG: RemoteDeviceConfig = {
  type: 'ir',
  name: 'IR Remote',
  icon: 'Router',
  hasScreenshot: false,
  hasOverlay: false,
  serverEndpoints: {
    connect: '/server/remote/connect',
    disconnect: '/server/remote/disconnect',
    command: '/server/remote/execute-command',
  },
};

// Bluetooth Remote configuration - uses server route proxying to host
export const BLUETOOTH_CONFIG: RemoteDeviceConfig = {
  type: 'bluetooth',
  name: 'Bluetooth Remote',
  icon: 'Bluetooth',
  hasScreenshot: false,
  hasOverlay: false,
  serverEndpoints: {
    connect: '/server/remote/connect',
    disconnect: '/server/remote/disconnect',
    command: '/server/remote/execute-command',
  },
};

// Configuration registry (USB_POWER_CONFIG moved to power controller)
export const REMOTE_CONFIGS = {
  'android-tv': ANDROID_TV_CONFIG,
  'android-mobile': ANDROID_MOBILE_CONFIG,
  ir: IR_CONFIG,
  bluetooth: BLUETOOTH_CONFIG,
} as const;

interface StreamInfo {
  videoElement: HTMLVideoElement;
  position: { x: number; y: number };
  size: { width: number; height: number };
  deviceResolution: { width: number; height: number };
}

interface RemoteConfig {
  type: string;
  capabilities: string[];
  connectionConfig?: any;
}

interface UseRemoteConfigsProps {
  host: Host;
  streamInfo?: StreamInfo;
}

interface UseRemoteConfigsReturn {
  remoteConfig: RemoteConfig | null;
  isLoading: boolean;
  error: string | null;
  handleStreamTap: (x: number, y: number) => Promise<void>;
  handleCoordinateTap: (x: number, y: number) => Promise<void>;
  refreshConfig: () => Promise<void>;
}

export function useRemoteConfigs({
  host,
  streamInfo,
}: UseRemoteConfigsProps): UseRemoteConfigsReturn {
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRemoteConfig = useCallback(async () => {
    if (!host) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[@hook:useRemoteConfigs] Loading remote config for host: ${host.host_name}`);

      // Extract remote config from host controller configs
      const config = host.controller_configs?.remote;

      if (config) {
        setRemoteConfig({
          type: config.type || 'unknown',
          capabilities: config.capabilities || [],
          connectionConfig: config.connectionConfig || null,
        });

        console.log(`[@hook:useRemoteConfigs] Remote config loaded:`, {
          type: config.type,
          capabilities: config.capabilities?.length || 0,
        });
      } else {
        console.log(`[@hook:useRemoteConfigs] No remote config found for host: ${host.host_name}`);
        setRemoteConfig(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load remote config';
      console.error(`[@hook:useRemoteConfigs] Error loading config:`, errorMessage);
      setError(errorMessage);
      setRemoteConfig(null);
    } finally {
      setIsLoading(false);
    }
  }, [host]);

  const handleStreamTap = useCallback(
    async (streamX: number, streamY: number) => {
      if (!host || !streamInfo) {
        console.warn(`[@hook:useRemoteConfigs] Stream tap called without host or stream info`);
        return;
      }

      try {
        console.log(`[@hook:useRemoteConfigs] Handling stream tap at (${streamX}, ${streamY})`);

        // Convert stream coordinates to device coordinates
        const deviceX = Math.round(
          (streamX / streamInfo.size.width) * streamInfo.deviceResolution.width,
        );
        const deviceY = Math.round(
          (streamY / streamInfo.size.height) * streamInfo.deviceResolution.height,
        );

        console.log(
          `[@hook:useRemoteConfigs] Converting stream tap to device coordinates: (${deviceX}, ${deviceY})`,
        );

        // Use centralized server route for stream tap
        const response = await fetch('/server/remote/stream-tap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: host,
            stream_x: streamX,
            stream_y: streamY,
            stream_width: streamInfo.size.width,
            stream_height: streamInfo.size.height,
            device_width: streamInfo.deviceResolution.width,
            device_height: streamInfo.deviceResolution.height,
          }),
        });

        const result = await response.json();

        if (result.success) {
          console.log(`[@hook:useRemoteConfigs] Stream tap executed successfully`);
        } else {
          console.error(`[@hook:useRemoteConfigs] Stream tap failed:`, result.error);
          throw new Error(result.error || 'Stream tap failed');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Stream tap error';
        console.error(`[@hook:useRemoteConfigs] Stream tap error:`, errorMessage);
        throw err;
      }
    },
    [host, streamInfo],
  );

  const handleCoordinateTap = useCallback(
    async (x: number, y: number) => {
      if (!host) {
        console.warn(`[@hook:useRemoteConfigs] Coordinate tap called without host`);
        return;
      }

      try {
        console.log(`[@hook:useRemoteConfigs] Handling coordinate tap at (${x}, ${y})`);

        // Use centralized server route for coordinate tap
        const response = await fetch('/server/remote/tap-coordinates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: host,
            x: x,
            y: y,
          }),
        });

        const result = await response.json();

        if (result.success) {
          console.log(`[@hook:useRemoteConfigs] Coordinate tap executed successfully`);
        } else {
          console.error(`[@hook:useRemoteConfigs] Coordinate tap failed:`, result.error);
          throw new Error(result.error || 'Coordinate tap failed');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Coordinate tap error';
        console.error(`[@hook:useRemoteConfigs] Coordinate tap error:`, errorMessage);
        throw err;
      }
    },
    [host],
  );

  const refreshConfig = useCallback(async () => {
    await loadRemoteConfig();
  }, [loadRemoteConfig]);

  useEffect(() => {
    loadRemoteConfig();
  }, [loadRemoteConfig]);

  return {
    remoteConfig,
    isLoading,
    error,
    handleStreamTap,
    handleCoordinateTap,
    refreshConfig,
  };
}

// Helper function to get config by type (kept for backward compatibility)
export function getRemoteConfig(remoteType: string): RemoteDeviceConfig | null {
  return REMOTE_CONFIGS[remoteType as keyof typeof REMOTE_CONFIGS] || null;
}
