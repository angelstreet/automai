import { Box, Alert } from '@mui/material';
import React from 'react';
import { HDMIStreamPanel } from './HDMIStreamPanel';
import { Host } from '../../../types/common/Host_Types';

interface AVPanelProps {
  /** Host device to control */
  host: Host;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Callback when connection state changes */
  onConnectionChange?: (connected: boolean) => void;
  /** Callback when disconnect is complete */
  onDisconnectComplete?: () => void;
  /** Custom styling */
  sx?: any;
}

export function AVPanel({
  host,
  autoConnect = false,
  onConnectionChange,
  onDisconnectComplete,
  sx = {},
}: AVPanelProps) {
  console.log(`[@component:AVPanel] Rendering AV panel for device model: ${host.device_model}`);

  // Instantiate specific AV component based on host.device_model
  const renderAVComponent = () => {
    switch (host.device_model) {
      case 'android_mobile':
      case 'android_tv':
        return (
          <HDMIStreamPanel
            host={host}
            autoConnect={autoConnect}
            onConnectionChange={onConnectionChange}
            onDisconnectComplete={onDisconnectComplete}
            compact={true}
            sx={sx}
          />
        );
      case 'ios_mobile':
        // Future: USBStreamPanel
        return (
          <Box sx={{ p: 2, ...sx }}>
            <Alert severity="info">USB Stream Panel for iOS devices - Coming Soon</Alert>
          </Box>
        );
      default:
        return (
          <Box sx={{ p: 2, ...sx }}>
            <Alert severity="warning">
              No AV component available for device model: {host.device_model}
            </Alert>
          </Box>
        );
    }
  };

  // Early return if no host provided
  if (!host) {
    return (
      <Box sx={{ p: 2, ...sx }}>
        <Alert severity="error">No host device provided for AV panel</Alert>
      </Box>
    );
  }

  return renderAVComponent();
}
