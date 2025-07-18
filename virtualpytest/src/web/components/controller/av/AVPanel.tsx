import { Box, Alert } from '@mui/material';

import { Host } from '../../../types/common/Host_Types';

import { HDMIStream } from './HDMIStream';
import { VNCStream } from './VNCStream';

interface AVPanelProps {
  host: Host;
  onReleaseControl?: () => void;
  onExpandedChange?: (isExpanded: boolean) => void;
}

export function AVPanel({ host, onExpandedChange }: AVPanelProps) {
  console.log(`[@component:AVPanel] Rendering AV panel for device: ${host.device_model}`);
  console.log(`[@component:AVPanel] Controller config:`, host.controller_configs);

  // Hardcoded default device resolution
  const defaultDeviceResolution = { width: 1920, height: 1080 };
  console.log(`[@component:AVPanel] Using default device resolution:`, defaultDeviceResolution);

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
        return (
          <HDMIStream
            host={host}
            onExpandedChange={onExpandedChange}
            deviceResolution={defaultDeviceResolution}
          />
        );
      case 'vnc_stream':
        return (
          <VNCStream
            host={host}
            deviceId="host_vnc"
            deviceModel="host_vnc"
            onExpandedChange={onExpandedChange}
          />
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
