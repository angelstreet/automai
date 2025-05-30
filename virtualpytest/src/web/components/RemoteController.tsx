import React from 'react';
import { AndroidMobileModal } from '../pages/controller/modals/AndroidMobileModal';
import { AndroidMobileRemotePanel } from './remote/AndroidMobileRemotePanel';
import { Dialog, DialogTitle, DialogContent, Box, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface RemoteControllerProps {
  deviceType: 'android_mobile' | 'android_tv' | 'ir_remote' | 'bluetooth_remote' | 'unknown';
  device?: {
    id: string;
    name: string;
    model: string;
    controller_configs?: any;
  };
  open: boolean;
  onClose: () => void;
}

export function RemoteController({ deviceType, device, open, onClose }: RemoteControllerProps) {
  console.log(`[@component:RemoteController] Rendering remote controller for device type: ${deviceType}`);

  // Extract connection config from device if available
  const getConnectionConfig = () => {
    if (!device?.controller_configs?.remote) return undefined;
    
    const config = device.controller_configs.remote;
    return {
      host_ip: config.host_ip,
      host_port: config.host_port || '22',
      host_username: config.host_username,
      host_password: config.host_password,
      device_ip: config.device_ip,
      device_port: config.device_port || '5555',
    };
  };

  // Render appropriate remote controller based on device type
  const renderRemoteController = () => {
    switch (deviceType) {
      case 'android_mobile':
        return (
          <AndroidMobileRemotePanel
            connectionConfig={getConnectionConfig()}
            autoConnect={false} // Let user manually connect
            compact={false}
            showScreenshot={true}
          />
        );
        
      case 'android_tv':
        return (
          <AndroidMobileRemotePanel
            connectionConfig={getConnectionConfig()}
            autoConnect={false}
            compact={false}
            showScreenshot={true}
          />
        );
        
      case 'ir_remote':
        return (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              IR Remote Controller
            </Typography>
            <Typography color="textSecondary">
              IR Remote controller coming soon...
            </Typography>
          </Box>
        );
        
      case 'bluetooth_remote':
        return (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Bluetooth Remote Controller
            </Typography>
            <Typography color="textSecondary">
              Bluetooth Remote controller coming soon...
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
              No remote controller available for this device type.
              Please configure the device controller settings.
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
        sx: { height: '80vh', maxHeight: '800px' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1 
      }}>
        <Box>
          <Typography variant="h6" component="div">
            Remote Controller
          </Typography>
          {device && (
            <Typography variant="subtitle2" color="textSecondary">
              {device.name} ({device.model})
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {renderRemoteController()}
      </DialogContent>
    </Dialog>
  );
}

// Helper function to determine device type from device model/name
export function getDeviceType(device: { name: string; model: string; controller_configs?: any }): RemoteControllerProps['deviceType'] {
  const deviceName = device.name.toLowerCase();
  const deviceModel = device.model.toLowerCase();
  
  // Check controller configs first
  if (device.controller_configs?.remote) {
    const remoteType = device.controller_configs.remote.type;
    if (remoteType === 'android_mobile' || remoteType === 'real_android_mobile') {
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
  }
  
  // Fallback to name/model detection
  if (deviceName.includes('android') || deviceModel.includes('android')) {
    // Determine if it's mobile or TV based on model/name
    if (deviceName.includes('phone') || deviceName.includes('mobile') || 
        deviceModel.includes('phone') || deviceModel.includes('mobile')) {
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
  
  return 'unknown';
} 