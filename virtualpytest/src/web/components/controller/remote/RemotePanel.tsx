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

  // Use dimensions directly from the loaded config
  const collapsedWidth = panelLayout.collapsed.width;
  const collapsedHeight = panelLayout.collapsed.height;
  const expandedWidth = panelLayout.expanded.width;
  const expandedHeight = panelLayout.expanded.height;

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
    console.log(
      `[@component:RemotePanel] Toggling panel state to ${!isCollapsed ? 'collapsed' : 'expanded'} for ${host.device_model}`,
    );
  };

  // Build position styles - simple container without scaling
  const positionStyles: any = {
    position: 'fixed',
    zIndex: panelLayout.zIndex,
    // Always anchor at bottom-right (collapsed position)
    bottom: panelLayout.collapsed.position.bottom || '20px',
    right: panelLayout.collapsed.position.right || '20px',
  };

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
      {/* Inner content container - uses appropriate size for state */}
      <Box
        sx={{
          width: isCollapsed ? collapsedWidth : expandedWidth,
          height: isCollapsed ? collapsedHeight : expandedHeight,
          position: 'absolute',
          // Simple positioning - bottom and right anchored
          bottom: 0,
          right: 0,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          boxShadow: 3,
          overflow: 'hidden',
          transition: 'width 0.3s ease-in-out, height 0.3s ease-in-out',
        }}
      >
        {/* Header with toggle button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: parseInt(remoteConfig?.panel_layout?.header?.padding || '8px') / 8,
            height: remoteConfig?.panel_layout?.header?.height || '48px',
            borderBottom: `1px solid ${remoteConfig?.panel_layout?.header?.borderColor || '#333'}`,
            bgcolor: remoteConfig?.panel_layout?.header?.backgroundColor || '#1E1E1E',
            color: remoteConfig?.panel_layout?.header?.textColor || '#ffffff',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: remoteConfig?.panel_layout?.header?.fontSize || '0.875rem',
              fontWeight: remoteConfig?.panel_layout?.header?.fontWeight || 'bold',
            }}
          >
            {remoteConfig?.remote_info?.name || `${host.device_model} Remote`}
          </Typography>
          <Tooltip title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}>
            <IconButton
              size={remoteConfig?.panel_layout?.header?.iconSize || 'small'}
              onClick={toggleCollapsed}
              sx={{ color: 'inherit' }}
            >
              {isCollapsed ? (
                <OpenInFull fontSize={remoteConfig?.panel_layout?.header?.iconSize || 'small'} />
              ) : (
                <CloseFullscreen
                  fontSize={remoteConfig?.panel_layout?.header?.iconSize || 'small'}
                />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Remote Content */}
        <Box
          sx={{
            height: `calc(100% - ${remoteConfig?.panel_layout?.header?.height || '48px'})`,
            overflow: 'hidden',
          }}
        >
          {renderRemoteComponent()}
        </Box>
      </Box>
    </Box>
  );
}
