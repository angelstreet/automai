import { OpenInFull, CloseFullscreen } from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useState, useEffect } from 'react';

import { getConfigurableRemotePanelLayout, loadRemoteConfig } from '../../../config/remote';
import { Host } from '../../../types/common/Host_Types';

import { AndroidMobileRemote } from './AndroidMobileRemote';

interface RemotePanelProps {
  host: Host;
  onReleaseControl?: () => void;
  initialCollapsed?: boolean;
}

export function RemotePanel({ host, onReleaseControl, initialCollapsed = true }: RemotePanelProps) {
  // Panel state
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [remoteConfig, setRemoteConfig] = useState<any>(null);

  // Load remote config for the device type
  useEffect(() => {
    const loadConfig = async () => {
      const config = await loadRemoteConfig(host.device_model);
      setRemoteConfig(config);
    };

    loadConfig();
  }, [host.device_model]);

  // Get configurable layout from device config
  const panelLayout = getConfigurableRemotePanelLayout(host.device_model, remoteConfig);

  // Determine current layout based on collapsed state
  const currentLayout = isCollapsed ? panelLayout.collapsed : panelLayout.expanded;

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
    console.log(
      `[@component:RemotePanel] Toggling panel state to ${!isCollapsed ? 'collapsed' : 'expanded'} for ${host.device_model}`,
    );
  };

  // Build position styles from config
  const positionStyles: any = {
    position: 'fixed',
    zIndex: panelLayout.zIndex,
    width: currentLayout.width,
    height: currentLayout.height,
    backgroundColor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    boxShadow: 3,
    overflow: 'hidden',
    transition: 'all 0.3s ease-in-out',
  };

  // Add positioning based on config
  if (currentLayout.position.top) positionStyles.top = currentLayout.position.top;
  if (currentLayout.position.bottom) positionStyles.bottom = currentLayout.position.bottom;
  if (currentLayout.position.left) positionStyles.left = currentLayout.position.left;
  if (currentLayout.position.right) positionStyles.right = currentLayout.position.right;

  // Simple device model detection - no loading, no fallback, no validation
  const renderRemoteComponent = () => {
    switch (host.device_model) {
      case 'android_mobile':
        return (
          <AndroidMobileRemote
            host={host}
            onDisconnectComplete={onReleaseControl}
            sx={{
              height: '100%',
              '& .MuiButton-root': {
                fontSize: isCollapsed ? '0.7rem' : '0.875rem',
              },
            }}
          />
        );
      case 'android_tv':
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 2,
            }}
          >
            <Typography variant="body2" color="textSecondary" textAlign="center">
              Android TV Remote (TODO)
            </Typography>
          </Box>
        );
      case 'ir_remote':
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 2,
            }}
          >
            <Typography variant="body2" color="textSecondary" textAlign="center">
              IR Remote (TODO)
            </Typography>
          </Box>
        );
      case 'bluetooth_remote':
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 2,
            }}
          >
            <Typography variant="body2" color="textSecondary" textAlign="center">
              Bluetooth Remote (TODO)
            </Typography>
          </Box>
        );
      default:
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 2,
            }}
          >
            <Typography variant="body2" color="textSecondary" textAlign="center">
              Unsupported device: {host.device_model}
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box sx={positionStyles}>
      {/* Header with toggle button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          {remoteConfig?.remote_info?.name || `${host.device_model} Remote`}
        </Typography>
        <Tooltip title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}>
          <IconButton size="small" onClick={toggleCollapsed} sx={{ color: 'inherit' }}>
            {isCollapsed ? <OpenInFull fontSize="small" /> : <CloseFullscreen fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Remote Content */}
      <Box sx={{ height: 'calc(100% - 48px)', overflow: 'hidden' }}>{renderRemoteComponent()}</Box>
    </Box>
  );
}
