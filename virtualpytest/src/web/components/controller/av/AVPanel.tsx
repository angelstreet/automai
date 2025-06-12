import { Box, Alert } from '@mui/material';
import React from 'react';

import { Host } from '../../../types/common/Host_Types';

import { HDMIStream } from './HDMIStream';

interface AVPanelProps {
  host: Host;
  onReleaseControl?: () => void;
}

export function AVPanel({ host }: AVPanelProps) {
  console.log(`[@component:AVPanel] Rendering AV panel for device: ${host.device_model}`);
  console.log(`[@component:AVPanel] Controller config:`, host.controller_configs);

  // Simple controller config detection - no loading, no fallback, no validation
  const renderAVComponent = () => {
    // Check if host has AV controller configuration
    const avConfig = host.controller_configs?.av;

    if (!avConfig) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="info">No AV configuration available for this device</Alert>
        </Box>
      );
    }

    // Select component based on AV controller implementation
    const avType = avConfig.implementation || avConfig.type || 'unknown';

    switch (avType) {
      case 'hdmi_stream':
        return <HDMIStream host={host} />;
      case 'usb_stream':
        return (
          <Box sx={{ p: 2 }}>
            <Alert severity="info">USB Stream Panel - Coming Soon</Alert>
          </Box>
        );
      case 'wireless_stream':
        return (
          <Box sx={{ p: 2 }}>
            <Alert severity="info">Wireless Stream Panel - Coming Soon</Alert>
          </Box>
        );
      default:
        return (
          <Box sx={{ p: 2 }}>
            <Alert severity="warning">Unsupported AV type: {String(avType)}</Alert>
          </Box>
        );
    }
  };

  return <Box sx={{ width: '100%', height: '100%' }}>{renderAVComponent()}</Box>;
}
