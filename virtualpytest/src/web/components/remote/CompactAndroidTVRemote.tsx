import React from 'react';
import { AndroidTVRemoteCore } from './AndroidTVRemoteCore';

interface CompactAndroidTVRemoteProps {
  /** Optional pre-configured connection parameters */
  connectionConfig?: {
    host_ip: string;
    host_port?: string;
    host_username: string;
    host_password: string;
    device_ip: string;
    device_port?: string;
  };
  /** Whether to auto-connect on mount if config is provided */
  autoConnect?: boolean;
  /** Show/hide screenshot display */
  showScreenshot?: boolean;
  /** Custom styling */
  sx?: any;
  /** Callback when disconnect is complete (for parent to handle additional actions like closing panel) */
  onDisconnectComplete?: () => void;
}

export function CompactAndroidTVRemote({
  connectionConfig,
  autoConnect = false,
  showScreenshot = true,
  sx = {},
  onDisconnectComplete
}: CompactAndroidTVRemoteProps) {
  return (
    <AndroidTVRemoteCore
      connectionConfig={connectionConfig}
      layout={{
        showConnectionForm: false, // Compact doesn't show full form
        showScreenshot: false, // Compact doesn't show screenshot
        direction: 'column', // Single column layout
        remoteStyle: 'absolute', // Absolute positioning like original
        sx: sx
      }}
      onDisconnectComplete={onDisconnectComplete}
    />
  );
} 