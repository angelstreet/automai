import { Box } from '@mui/material';

import { Host } from '../../../types/common/Host_Types';

import { AndroidMobileRemote } from './AndroidMobileRemote';

interface RemotePanelProps {
  host: Host;
  onReleaseControl?: () => void;
}

export function RemotePanel({ host, onReleaseControl }: RemotePanelProps) {
  // Simple device model detection - no loading, no fallback, no validation
  const renderRemoteComponent = () => {
    switch (host.device_model) {
      case 'android_mobile':
        return <AndroidMobileRemote host={host} onDisconnectComplete={onReleaseControl} />;
      case 'android_tv':
        return <div>Android TV Remote (TODO)</div>;
      case 'ir_remote':
        return <div>IR Remote (TODO)</div>;
      case 'bluetooth_remote':
        return <div>Bluetooth Remote (TODO)</div>;
      default:
        return <div>Unsupported device: {host.device_model}</div>;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {renderRemoteComponent()}
    </Box>
  );
}
