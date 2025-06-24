import {
  OpenInFull,
  CloseFullscreen,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';

import { getConfigurableRemotePanelLayout, loadRemoteConfig } from '../../../config/remote';
import { Host } from '../../../types/common/Host_Types';

import { AndroidMobileRemote } from './AndroidMobileRemote';
import { AndroidTvRemote } from './AndroidTvRemote';
import { AppiumRemote } from './AppiumRemote';

interface RemotePanelProps {
  host: Host;
  deviceId: string; // Device ID to select the correct device and controllers
  deviceModel: string; // Device model for remote config loading
  onReleaseControl?: () => void;
  initialCollapsed?: boolean;
  // Device resolution for overlay scaling
  deviceResolution?: { width: number; height: number };
  // Stream collapsed state for overlay coordination
  streamCollapsed?: boolean;
  // Stream minimized state for overlay coordination
  streamMinimized?: boolean;
  // Current capture mode from HDMIStream
  captureMode?: 'stream' | 'screenshot' | 'video';
  // NEW: Stream container dimensions for modal context
  streamContainerDimensions?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

export const RemotePanel = React.memo(
  function RemotePanel({
    host,
    deviceId,
    deviceModel,
    onReleaseControl,
    initialCollapsed = true,
    deviceResolution,
    streamCollapsed = true,
    streamMinimized = false,
    captureMode = 'stream',
    streamContainerDimensions,
  }: RemotePanelProps) {
    console.log(`[@component:RemotePanel] Props debug:`, {
      deviceId,
      deviceModel,
      deviceResolution,
      initialCollapsed,
      streamCollapsed,
    });

    // Panel state - three states: expanded, collapsed, minimized
    const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
    const [isMinimized, setIsMinimized] = useState(false);
    const [remoteConfig, setRemoteConfig] = useState<any>(null);

    // Load remote config for the device type
    useEffect(() => {
      const loadConfig = async () => {
        const config = await loadRemoteConfig(deviceModel);
        setRemoteConfig(config);
      };

      loadConfig();
    }, [deviceModel]);

    // Get configurable layout from device config - memoized to prevent infinite loops
    const panelLayout = useMemo(() => {
      return getConfigurableRemotePanelLayout(deviceModel, remoteConfig);
    }, [deviceModel, remoteConfig]);

    // Calculate dimensions inline - no state, no useEffects
    const collapsedWidth = panelLayout.collapsed.width;
    const collapsedHeight = panelLayout.collapsed.height;
    const expandedWidth = panelLayout.expanded.width;
    const expandedHeight = panelLayout.expanded.height;
    const headerHeight = remoteConfig?.panel_layout?.header?.height || '48px';

    // Current panel dimensions based on state
    const currentWidth = isCollapsed ? collapsedWidth : expandedWidth;
    const currentHeight = isMinimized
      ? headerHeight
      : isCollapsed
        ? collapsedHeight
        : expandedHeight;

    console.log(`[@component:RemotePanel] Panel state debug:`, {
      isCollapsed,
      isMinimized,
      currentWidth,
      currentHeight,
      deviceResolution,
    });

    // Smart toggle handlers with minimized state logic
    const handleMinimizeToggle = () => {
      if (isMinimized) {
        // Restore from minimized to collapsed state
        setIsMinimized(false);
        setIsCollapsed(true);
        console.log(
          `[@component:RemotePanel] Restored from minimized to collapsed for ${deviceModel}`,
        );
      } else {
        // Minimize the panel
        setIsMinimized(true);
        console.log(`[@component:RemotePanel] Minimized panel for ${deviceModel}`);
      }
    };

    const handleExpandCollapseToggle = () => {
      if (isMinimized) {
        // First restore from minimized to collapsed, then user can click again to expand
        setIsMinimized(false);
        setIsCollapsed(true);
        console.log(
          `[@component:RemotePanel] Restored from minimized to collapsed for ${deviceModel}`,
        );
      } else {
        // Normal expand/collapse logic
        setIsCollapsed(!isCollapsed);
        console.log(
          `[@component:RemotePanel] Toggling panel state to ${!isCollapsed ? 'collapsed' : 'expanded'} for ${deviceModel}`,
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

    // Simple device model detection - no loading, no fallback, no validation
    const effectiveDeviceResolution = useMemo(() => {
      return deviceResolution || { width: 1920, height: 1080 };
    }, [deviceResolution]);

    const renderRemoteComponent = useMemo(() => {
      switch (deviceModel) {
        case 'android_mobile':
          return (
            <AndroidMobileRemote
              host={host}
              deviceId={deviceId}
              onDisconnectComplete={onReleaseControl}
              isCollapsed={isCollapsed}
              panelWidth={currentWidth}
              panelHeight={currentHeight}
              deviceResolution={effectiveDeviceResolution}
              streamCollapsed={streamCollapsed}
              streamMinimized={streamMinimized}
              captureMode={captureMode}
              streamContainerDimensions={streamContainerDimensions}
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
            <AndroidTvRemote
              host={host}
              onDisconnectComplete={onReleaseControl}
              isCollapsed={isCollapsed}
              panelWidth={currentWidth}
              panelHeight={currentHeight}
              sx={{
                height: '100%',
                '& .MuiButton-root': {
                  fontSize: isCollapsed ? '0.6rem' : '0.7rem',
                },
              }}
            />
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
        case 'ios_mobile':
          return (
            <AppiumRemote
              host={host}
              onDisconnectComplete={onReleaseControl}
              isCollapsed={isCollapsed}
              panelWidth={currentWidth}
              panelHeight={currentHeight}
              deviceResolution={effectiveDeviceResolution}
              streamCollapsed={streamCollapsed}
              streamMinimized={streamMinimized}
              captureMode={captureMode}
              sx={{
                height: '100%',
                '& .MuiButton-root': {
                  fontSize: isCollapsed ? '0.7rem' : '0.875rem',
                },
              }}
            />
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
                Unsupported device: {deviceModel}
              </Typography>
            </Box>
          );
      }
    }, [
      host,
      deviceId,
      deviceModel,
      onReleaseControl,
      isCollapsed,
      currentWidth,
      currentHeight,
      effectiveDeviceResolution,
      streamCollapsed,
      streamMinimized,
      captureMode,
      streamContainerDimensions,
    ]);

    return (
      <Box sx={positionStyles}>
        {/* Inner content container - uses appropriate size for state */}
        <Box
          sx={{
            width: currentWidth,
            height: currentHeight,
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
              {remoteConfig?.remote_info?.name || `${deviceModel} Remote`}
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
                    <OpenInFull
                      fontSize={remoteConfig?.panel_layout?.header?.iconSize || 'small'}
                    />
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
              {renderRemoteComponent}
            </Box>
          )}
        </Box>
      </Box>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    // Only re-render if meaningful props have changed
    const hostChanged = JSON.stringify(prevProps.host) !== JSON.stringify(nextProps.host);
    const deviceIdChanged = prevProps.deviceId !== nextProps.deviceId;
    const deviceModelChanged = prevProps.deviceModel !== nextProps.deviceModel;
    const deviceResolutionChanged =
      JSON.stringify(prevProps.deviceResolution) !== JSON.stringify(nextProps.deviceResolution);
    const initialCollapsedChanged = prevProps.initialCollapsed !== nextProps.initialCollapsed;
    const streamCollapsedChanged = prevProps.streamCollapsed !== nextProps.streamCollapsed;
    const streamMinimizedChanged = prevProps.streamMinimized !== nextProps.streamMinimized;
    const captureModeChanged = prevProps.captureMode !== nextProps.captureMode;
    const onReleaseControlChanged = prevProps.onReleaseControl !== nextProps.onReleaseControl;
    const streamContainerDimensionsChanged =
      JSON.stringify(prevProps.streamContainerDimensions) !==
      JSON.stringify(nextProps.streamContainerDimensions);

    // Return true if props are equal (don't re-render), false if they changed (re-render)
    const shouldSkipRender =
      !hostChanged &&
      !deviceIdChanged &&
      !deviceModelChanged &&
      !deviceResolutionChanged &&
      !initialCollapsedChanged &&
      !streamCollapsedChanged &&
      !streamMinimizedChanged &&
      !captureModeChanged &&
      !onReleaseControlChanged &&
      !streamContainerDimensionsChanged;

    if (!shouldSkipRender) {
      console.log(`[@component:RemotePanel] Re-rendering due to prop changes:`, {
        hostChanged,
        deviceIdChanged,
        deviceModelChanged,
        deviceResolutionChanged,
        initialCollapsedChanged,
        streamCollapsedChanged,
        streamMinimizedChanged,
        captureModeChanged,
        onReleaseControlChanged,
        streamContainerDimensionsChanged,
      });
    }

    return shouldSkipRender;
  },
);
