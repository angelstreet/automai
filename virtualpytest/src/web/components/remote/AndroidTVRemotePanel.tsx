import React from 'react';
import { AndroidTVRemoteCore } from './AndroidTVRemoteCore';

interface AndroidTVRemotePanelProps {
  /** Optional pre-configured connection parameters */
  connectionConfig?: {
    host_ip: string;
    host_port?: string;
    host_username: string;
    host_password: string;
    device_ip: string;
    device_port?: string;
  };
  /** Compact mode for smaller spaces like NavigationEditor */
  compact?: boolean;
  /** Show/hide screenshot display */
  showScreenshot?: boolean;
  /** Custom styling */
  sx?: any;
}

export function AndroidTVRemotePanel({
  connectionConfig,
  compact = false,
  showScreenshot = true,
  sx = {}
}: AndroidTVRemotePanelProps) {
  return (
    <AndroidTVRemoteCore
      connectionConfig={connectionConfig}
      layout={{
        showConnectionForm: true, // Panel shows full connection form
        showScreenshot: showScreenshot, // Based on prop
        direction: 'row', // Two-column layout
        remoteStyle: 'absolute', // Absolute positioning in bordered container
        sx: sx
      }}
    />
  );
} 