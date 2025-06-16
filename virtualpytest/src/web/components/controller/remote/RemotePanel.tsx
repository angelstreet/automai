import {
  OpenInFull,
  CloseFullscreen,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useState, useEffect } from 'react';

import { getConfigurableRemotePanelLayout, loadRemoteConfig } from '../../../config/remote';
import { Host } from '../../../types/common/Host_Types';

import { AndroidMobileRemote } from './AndroidMobileRemote';

interface RemotePanelProps {
  host: Host;
  onReleaseControl?: () => void;
  initialCollapsed?: boolean;
  // Panel dimensions and positions for overlay positioning
  collapsedPosition?: { x: number; y: number };
  collapsedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  expandedSize?: { width: number; height: number };
  // Device resolution for overlay scaling
  deviceResolution?: { width: number; height: number };
}

export function RemotePanel({
  host,
  onReleaseControl,
  initialCollapsed = true,
  collapsedPosition,
  collapsedSize,
  expandedPosition,
  expandedSize,
  deviceResolution,
}: RemotePanelProps) {
  // Panel state - three states: expanded, collapsed, minimized
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isMinimized, setIsMinimized] = useState(false);
  const [remoteConfig, setRemoteConfig] = useState<any>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Load remote config for the device type
  useEffect(() => {
    const loadConfig = async () => {
      const config = await loadRemoteConfig(host.device_model);
      setRemoteConfig(config);
    };

    loadConfig();
  }, [host.device_model]);

  // Force re-render when panel state changes to recalculate positions
  useEffect(() => {
    setForceUpdate((prev) => prev + 1);
  }, [isCollapsed, isMinimized]);

  // Handle window resize to recalculate positions
  useEffect(() => {
    const handleResize = () => {
      console.log(`[@component:RemotePanel] Window resized, recalculating positions`);
      setForceUpdate((prev) => prev + 1);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get configurable layout from device config
  const panelLayout = getConfigurableRemotePanelLayout(host.device_model, remoteConfig);

  // Use dimensions directly from the loaded config
  const collapsedWidth = panelLayout.collapsed.width;
  const collapsedHeight = panelLayout.collapsed.height;
  const expandedWidth = panelLayout.expanded.width;
  const expandedHeight = panelLayout.expanded.height;
  const headerHeight = remoteConfig?.panel_layout?.header?.height || '48px';

  // Smart toggle handlers with minimized state logic
  const handleMinimizeToggle = () => {
    if (isMinimized) {
      // Restore from minimized to collapsed state
      setIsMinimized(false);
      setIsCollapsed(true);
      console.log(
        `[@component:RemotePanel] Restored from minimized to collapsed for ${host.device_model}`,
      );
    } else {
      // Minimize the panel
      setIsMinimized(true);
      console.log(`[@component:RemotePanel] Minimized panel for ${host.device_model}`);
    }
  };

  const handleExpandCollapseToggle = () => {
    if (isMinimized) {
      // First restore from minimized to collapsed, then user can click again to expand
      setIsMinimized(false);
      setIsCollapsed(true);
      console.log(
        `[@component:RemotePanel] Restored from minimized to collapsed for ${host.device_model}`,
      );
    } else {
      // Normal expand/collapse logic
      setIsCollapsed(!isCollapsed);
      console.log(
        `[@component:RemotePanel] Toggling panel state to ${!isCollapsed ? 'collapsed' : 'expanded'} for ${host.device_model}`,
      );
    }
  };

  // Build position styles - simple container without scaling
  const positionStyles: any = {
    position: 'fixed',
    zIndex: panelLayout.zIndex,
    // Always anchor at bottom-right (collapsed position)
    bottom: panelLayout.collapsed.position.bottom || '20px',
    right: panelLayout.collapsed.position.right || '20px',
  };

  // Calculate panel dimensions based on state
  const getPanelWidth = () => {
    if (isMinimized) return collapsedWidth; // Use collapsed width when minimized
    return isCollapsed ? collapsedWidth : expandedWidth;
  };

  const getPanelHeight = () => {
    if (isMinimized) return headerHeight; // Only header height when minimized
    return isCollapsed ? collapsedHeight : expandedHeight;
  };

  // Simple device model detection - no loading, no fallback, no validation
  const renderRemoteComponent = () => {
    // Calculate actual pixel positions for the panel
    // Since we use fixed positioning with bottom/right anchors, we need to calculate the actual screen coordinates

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Parse CSS values to numbers
    const parsePixels = (value: string) => parseInt(value.replace('px', ''), 10);
    const bottomOffset = parsePixels(panelLayout.collapsed.position.bottom || '20px');
    const rightOffset = parsePixels(panelLayout.collapsed.position.right || '20px');

    // Calculate current panel dimensions
    const currentWidth = parsePixels(isCollapsed ? collapsedWidth : expandedWidth);
    const currentHeight = parsePixels(isCollapsed ? collapsedHeight : expandedHeight);

    // Calculate actual screen position (top-left coordinates)
    const actualPosition = {
      x: viewportWidth - rightOffset - currentWidth,
      y: viewportHeight - bottomOffset - currentHeight,
    };

    const actualSize = {
      width: currentWidth,
      height: currentHeight,
    };

    console.log(`[@component:RemotePanel] Panel positioning debug:`, {
      isCollapsed,
      viewportSize: { width: viewportWidth, height: viewportHeight },
      panelSize: actualSize,
      panelPosition: actualPosition,
      deviceResolution,
    });

    // Calculate positions for both states (for panelState prop)
    const collapsedActualPosition = {
      x: viewportWidth - rightOffset - parsePixels(collapsedWidth),
      y: viewportHeight - bottomOffset - parsePixels(collapsedHeight),
    };

    const expandedActualPosition = {
      x: viewportWidth - rightOffset - parsePixels(expandedWidth),
      y: viewportHeight - bottomOffset - parsePixels(expandedHeight),
    };

    switch (host.device_model) {
      case 'android_mobile':
        return (
          <AndroidMobileRemote
            host={host}
            onDisconnectComplete={onReleaseControl}
            streamPosition={actualPosition}
            streamSize={actualSize}
            streamResolution={deviceResolution}
            panelState={{
              isCollapsed,
              collapsedPosition: collapsedActualPosition,
              collapsedSize: {
                width: parsePixels(collapsedWidth),
                height: parsePixels(collapsedHeight),
              },
              expandedPosition: expandedActualPosition,
              expandedSize: {
                width: parsePixels(expandedWidth),
                height: parsePixels(expandedHeight),
              },
            }}
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
          width: getPanelWidth(),
          height: getPanelHeight(),
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
        {/* Header with minimize and expand/collapse buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: parseInt(remoteConfig?.panel_layout?.header?.padding || '8px') / 8,
            height: headerHeight,
            borderBottom: isMinimized
              ? 'none'
              : `1px solid ${remoteConfig?.panel_layout?.header?.borderColor || '#333'}`,
            bgcolor: remoteConfig?.panel_layout?.header?.backgroundColor || '#1E1E1E',
            color: remoteConfig?.panel_layout?.header?.textColor || '#ffffff',
          }}
        >
          {/* Center: Title */}
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: remoteConfig?.panel_layout?.header?.fontSize || '0.875rem',
              fontWeight: remoteConfig?.panel_layout?.header?.fontWeight || 'bold',
              flex: 1,
              textAlign: 'center',
            }}
          >
            {remoteConfig?.remote_info?.name || `${host.device_model} Remote`}
          </Typography>

          {/* Right side: Minimize and Expand/Collapse buttons */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* Minimize/Restore button */}
            <Tooltip title={isMinimized ? 'Restore Panel' : 'Minimize Panel'}>
              <IconButton
                size={remoteConfig?.panel_layout?.header?.iconSize || 'small'}
                onClick={handleMinimizeToggle}
                sx={{ color: 'inherit' }}
              >
                {isMinimized ? (
                  <KeyboardArrowUp
                    fontSize={remoteConfig?.panel_layout?.header?.iconSize || 'small'}
                  />
                ) : (
                  <KeyboardArrowDown
                    fontSize={remoteConfig?.panel_layout?.header?.iconSize || 'small'}
                  />
                )}
              </IconButton>
            </Tooltip>

            {/* Expand/Collapse button */}
            <Tooltip
              title={
                isMinimized ? 'Restore Panel' : isCollapsed ? 'Expand Panel' : 'Collapse Panel'
              }
            >
              <IconButton
                size={remoteConfig?.panel_layout?.header?.iconSize || 'small'}
                onClick={handleExpandCollapseToggle}
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
        </Box>

        {/* Remote Content - hidden when minimized */}
        {!isMinimized && (
          <Box
            sx={{
              height: `calc(100% - ${headerHeight})`,
              overflow: 'hidden',
            }}
          >
            {renderRemoteComponent()}
          </Box>
        )}
      </Box>
    </Box>
  );
}
