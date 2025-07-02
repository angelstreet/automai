import { Close as CloseIcon } from '@mui/icons-material';
import { Dialog, DialogTitle, DialogContent, Box, Typography, IconButton } from '@mui/material';
import React from 'react';

import { RemotePanel } from './remote/RemotePanel';

interface RemoteControllerProps {
  deviceType:
    | 'android_mobile'
    | 'android_tv'
    | 'ir_remote'
    | 'bluetooth_remote'
    | 'hdmi_stream'
    | 'unknown';
  device?: {
    device_id: string;
    device_name: string;
    device_model: string;
    controller_configs?: any;
  };
  open: boolean;
  onClose: () => void;
}

export function RemoteController({ deviceType, device, open, onClose }: RemoteControllerProps) {
  console.log(
    `[@component:RemoteController] Rendering remote controller for device type: ${deviceType}`,
  );

  const getAndroidConnectionConfig = () => {
    // Find any remote controller config
    if (!device?.controller_configs) return undefined;
    const remoteKey = Object.keys(device.controller_configs).find((key) =>
      key.startsWith('remote_'),
    );
    if (!remoteKey) return undefined;

    const config = device.controller_configs[remoteKey];
    return {
      device_ip: config.device_ip,
      device_port: config.device_port || '5555',
    };
  };

  const getIRConnectionConfig = () => {
    // Find any remote controller config
    if (!device?.controller_configs) return undefined;
    const remoteKey = Object.keys(device.controller_configs).find((key) =>
      key.startsWith('remote_'),
    );
    if (!remoteKey) return undefined;

    const config = device.controller_configs[remoteKey];
    return {
      device_path: config.ir_device || config.device_path,
      protocol: config.protocol,
      frequency: config.frequency,
    };
  };

  const getBluetoothConnectionConfig = () => {
    // Find any remote controller config
    if (!device?.controller_configs) return undefined;
    const remoteKey = Object.keys(device.controller_configs).find((key) =>
      key.startsWith('remote_'),
    );
    if (!remoteKey) return undefined;

    const config = device.controller_configs[remoteKey];
    return {
      device_address: config.device_address,
      device_name: config.device_name,
      pairing_pin: config.pairing_pin,
    };
  };

  // Render appropriate remote controller based on device type
  const renderRemoteController = () => {
    switch (deviceType) {
      case 'android_mobile':
        return (
          <RemotePanel
            remoteType="android-mobile"
            connectionConfig={getAndroidConnectionConfig()}
            showScreenshot={true}
          />
        );

      case 'android_tv':
        return (
          <RemotePanel
            remoteType="android-tv"
            connectionConfig={getAndroidConnectionConfig()}
            showScreenshot={true}
          />
        );

      case 'ir_remote':
        return (
          <RemotePanel
            remoteType="ir"
            connectionConfig={getIRConnectionConfig() as any}
            showScreenshot={false}
          />
        );

      case 'bluetooth_remote':
        return (
          <RemotePanel
            remoteType="bluetooth"
            connectionConfig={getBluetoothConnectionConfig() as any}
            showScreenshot={false}
          />
        );

      case 'hdmi_stream':
        // HDMI Stream doesn't have a generic component yet, show unsupported message
        return (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom color="warning">
              HDMI Stream Remote
            </Typography>
            <Typography color="textSecondary">
              HDMI Stream remote is not yet supported by the generic remote system.
            </Typography>
          </Box>
        );

      case 'unknown':
      default:
        return (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom color="error">
              Unsupported Device Type
            </Typography>
            <Typography color="textSecondary">
              No remote controller available for this device type. Please configure the device
              controller settings.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', maxHeight: '800px' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" component="div">
            Remote Controller
          </Typography>
          {device && (
            <Typography variant="subtitle2" color="textSecondary">
              {device.device_name} ({device.device_model})
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>{renderRemoteController()}</DialogContent>
    </Dialog>
  );
}

// Helper function to determine device type from device model/name
export function getDeviceType(device: {
  device_name: string;
  device_model: string;
  controller_configs?: any;
}): RemoteControllerProps['deviceType'] {
  const deviceName = device.device_name.toLowerCase();
  const deviceModel = device.device_model.toLowerCase();

  // Check controller configs first
  if (device.controller_configs) {
    const remoteKey = Object.keys(device.controller_configs).find((key) =>
      key.startsWith('remote_'),
    );
    if (remoteKey) {
      const remoteType = device.controller_configs[remoteKey].implementation;
      if (remoteType === 'android_mobile') {
        return 'android_mobile';
      }
      if (remoteType === 'android_tv') {
        return 'android_tv';
      }
      if (remoteType === 'ir_remote') {
        return 'ir_remote';
      }
      if (remoteType === 'bluetooth_remote') {
        return 'bluetooth_remote';
      }
      if (remoteType === 'hdmi_stream') {
        return 'hdmi_stream';
      }
    }
  }

  // Fallback to name/model detection
  if (deviceName.includes('android') || deviceModel.includes('android')) {
    // Determine if it's mobile or TV based on model/name
    if (
      deviceName.includes('phone') ||
      deviceName.includes('mobile') ||
      deviceModel.includes('phone') ||
      deviceModel.includes('mobile')
    ) {
      return 'android_mobile';
    }
    if (deviceName.includes('tv') || deviceModel.includes('tv')) {
      return 'android_tv';
    }
    // Default Android devices to mobile
    return 'android_mobile';
  }

  // Check for other device types
  if (deviceName.includes('ir') || deviceName.includes('infrared')) {
    return 'ir_remote';
  }

  if (deviceName.includes('bluetooth') || deviceName.includes('bt')) {
    return 'bluetooth_remote';
  }

  if (deviceName.includes('hdmi') || deviceName.includes('hdmi_stream')) {
    return 'hdmi_stream';
  }

  return 'unknown';
}
