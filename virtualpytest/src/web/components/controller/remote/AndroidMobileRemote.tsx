import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import React from 'react';

import { useAndroidMobile } from '../../../hooks/controller/useAndroidMobile';
import { useRemoteConfigs } from '../../../hooks/controller/useRemoteConfigs';
import { Host } from '../../../types/common/Host_Types';
import { AndroidElement } from '../../../types/controller/Remote_Types';
import { PanelInfo } from '../../../types/controller/Panel_Types';
import { createPortal } from 'react-dom';
import { hdmiStreamMobileConfig, HDMI_STREAM_HEADER_HEIGHT } from '../../../config/av/hdmiStream';

import { AndroidMobileOverlay } from './AndroidMobileOverlay';

interface AndroidMobileRemoteProps {
  host: Host;
  onDisconnectComplete?: () => void;
  sx?: any;
  // Simplified panel state props
  isCollapsed: boolean;
  panelWidth: string;
  panelHeight: string;
  deviceResolution: { width: number; height: number };
  // Stream collapsed state for overlay coordination
  streamCollapsed?: boolean;
  // Stream minimized state for overlay coordination
  streamMinimized?: boolean;
  // Current capture mode from HDMIStream
  captureMode?: 'stream' | 'screenshot' | 'video';
}

export const AndroidMobileRemote = React.memo(
  function AndroidMobileRemote({
    host,
    onDisconnectComplete,
    sx = {},
    isCollapsed,
    panelWidth,
    panelHeight,
    deviceResolution,
    streamCollapsed,
    streamMinimized = false,
    captureMode = 'stream',
  }: AndroidMobileRemoteProps) {
    const {
      // State
      androidElements,
      androidApps,
      showOverlay,
      selectedElement,
      selectedApp,
      isDumpingUI,
      isDisconnecting,
      isRefreshingApps,
      screenshotRef,

      // Actions
      handleDisconnect,
      handleOverlayElementClick,
      handleRemoteCommand,
      clearElements,
      handleGetApps,
      handleDumpUIWithLoading,

      // Setters
      setSelectedElement,
      setSelectedApp,

      // Configuration
      layoutConfig,

      // Session info
      session,
    } = useAndroidMobile(host);

    // Panel integration - prepare panelInfo for overlay
    const panelInfo: PanelInfo | undefined = React.useMemo(() => {
      // Use hardcoded device resolution for consistency
      const hardcodedResolution = { width: 1920, height: 1080 };

      // Skip unnecessary recalculations if missing required props
      if (!panelWidth || !panelHeight || !deviceResolution) {
        console.log(
          '[@component:AndroidMobileRemote] panelInfo is undefined - missing required props',
        );
        return undefined;
      }

      console.log('[@component:AndroidMobileRemote] PanelInfo debug:', {
        isCollapsed,
        panelWidth,
        panelHeight,
        deviceResolution,
        streamCollapsed,
        hardcodedResolution,
      });

      // Get HDMI stream dimensions from config based on stream collapsed state (not panel state)
      const streamConfig = hdmiStreamMobileConfig.panel_layout;
      const currentStreamConfig = streamCollapsed ? streamConfig.collapsed : streamConfig.expanded;

      // Parse dimensions from config
      const parsePixels = (value: string) => parseInt(value.replace('px', ''), 10);

      // Use stream panel dimensions from config, not remote panel dimensions
      const streamPanelWidth = parsePixels(currentStreamConfig.width);
      const streamPanelHeight = parsePixels(currentStreamConfig.height);

      // Calculate actual stream content area
      // Use shared header height constant for consistency
      const headerHeight = parsePixels(HDMI_STREAM_HEADER_HEIGHT);
      const streamContentHeight = streamPanelHeight - headerHeight; // Stream panel height minus header

      // Calculate stream width based on hardcoded 1920x1080 aspect ratio (16:9)
      // For mobile: height is reference, calculate width based on 16:9 aspect ratio
      const deviceAspectRatio = hardcodedResolution.width / hardcodedResolution.height; // 1920/1080 = 1.777...
      const streamContentWidth = streamContentHeight * deviceAspectRatio;

      // Debug logging for width calculation
      console.log(`[@component:AndroidMobileRemote] Width calculation debug:`, {
        streamCollapsed,
        configState: streamCollapsed ? 'collapsed' : 'expanded',
        streamPanelWidth,
        streamPanelHeight,
        headerHeight,
        streamContentHeight,
        deviceAspectRatio,
        hardcodedResolution,
        calculatedWidth: streamContentWidth,
        roundedWidth: Math.round(streamContentWidth),
      });

      // Calculate stream position - centered in panel
      const panelX =
        'left' in currentStreamConfig.position
          ? parsePixels(currentStreamConfig.position.left)
          : 20;
      const panelY =
        window.innerHeight -
        parsePixels(currentStreamConfig.position.bottom || '20px') -
        streamPanelHeight;

      // Calculate content position (accounting for header)
      const streamActualPosition = {
        x: panelX + (streamPanelWidth - streamContentWidth) / 2, // Center horizontally
        y: panelY + headerHeight, // Position below header
      };

      const streamActualSize = {
        width: Math.round(streamContentWidth),
        height: Math.round(streamContentHeight),
      };

      const info = {
        position: streamActualPosition, // Use calculated stream position
        size: streamActualSize, // Use calculated stream size with proper aspect ratio
        deviceResolution: hardcodedResolution, // Use hardcoded 1920x1080 everywhere
        isCollapsed: streamCollapsed ?? true, // Use stream collapsed state directly, default to collapsed
      };
      console.log('[@component:AndroidMobileRemote] Created panelInfo for stream overlay:', info);
      return info;
    }, [isCollapsed, panelWidth, panelHeight, deviceResolution, streamCollapsed]);

    // Use remote configs for panel tap functionality
    // Create temporary adapter for compatibility with useRemoteConfigs
    const streamInfoAdapter = React.useMemo(() => {
      if (panelInfo) {
        return {
          videoElement: null as any, // Not needed for panel tap
          position: panelInfo.position,
          size: panelInfo.size,
          deviceResolution: panelInfo.deviceResolution,
        };
      }
      return undefined;
    }, [panelInfo]);

    const { handleStreamTap } = useRemoteConfigs({
      host,
      streamInfo: streamInfoAdapter,
    });

    const handleDisconnectWithCallback = async () => {
      await handleDisconnect();
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    };

    const getElementDisplayName = (el: AndroidElement) => {
      let displayName = '';

      // Debug logging for first few elements
      if (parseInt(el.id) <= 3) {
        console.log(`[@component:AndroidMobileRemote] Element ${el.id} debug:`, {
          contentDesc: el.contentDesc,
          text: el.text,
          className: el.className,
        });
      }

      // Priority: ContentDesc → Text → Class Name (same as UIElementsOverlay)
      if (
        el.contentDesc &&
        el.contentDesc !== '<no content-desc>' &&
        el.contentDesc.trim() !== ''
      ) {
        displayName = `${el.contentDesc}`;
      } else if (el.text && el.text !== '<no text>' && el.text.trim() !== '') {
        displayName = `"${el.text}"`;
      } else {
        displayName = `${el.className?.split('.').pop() || 'Unknown'}`;
      }

      // Prepend element ID with compact format
      const fullDisplayName = `${el.id}.${displayName}`;

      // Limit display name length
      if (fullDisplayName.length > 30) {
        return fullDisplayName.substring(0, 27) + '...';
      }
      return fullDisplayName;
    };

    return (
      <Box
        sx={{ ...sx, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      >
        <Box
          sx={{
            p: 2,
            flex: 1,
            overflow: 'auto',
            maxWidth: `${layoutConfig.containerWidth}px`,
            margin: '0 auto',
            width: '100%',
            // Prevent the container from affecting global scrollbar
            contain: 'layout style',
          }}
        >
          <Box
            sx={{
              maxWidth: '250px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            {/* App Launcher Section */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                App Launcher ({androidApps.length} apps)
              </Typography>

              <Box sx={{ mb: 1, mt: 1 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select an app...</InputLabel>
                  <Select
                    value={selectedApp}
                    label="Select an app..."
                    disabled={androidApps.length === 0 || isRefreshingApps}
                    onChange={(e) => {
                      const appPackage = e.target.value;
                      if (appPackage) {
                        setSelectedApp(appPackage);
                        handleRemoteCommand('LAUNCH_APP', { package: appPackage });
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 200,
                          width: 'auto',
                          maxWidth: '100%',
                        },
                      },
                    }}
                  >
                    {androidApps.map((app) => (
                      <MenuItem
                        key={app.packageName}
                        value={app.packageName}
                        sx={{
                          fontSize: '0.875rem',
                          py: 1,
                          px: 2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {app.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={handleGetApps}
                disabled={!session.connected || isRefreshingApps}
                fullWidth
              >
                {isRefreshingApps ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption">Loading...</Typography>
                  </Box>
                ) : (
                  'Refresh Apps'
                )}
              </Button>
            </Box>

            {/* UI Elements Section */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                UI Elements ({androidElements.length})
              </Typography>

              <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleDumpUIWithLoading}
                  disabled={!session.connected || isDumpingUI}
                  sx={{ flex: 1 }}
                >
                  {isDumpingUI ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption">Capturing...</Typography>
                    </Box>
                  ) : (
                    'Dump UI'
                  )}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={clearElements}
                  disabled={androidElements.length === 0}
                  sx={{ flex: 1 }}
                >
                  Clear
                </Button>
              </Box>

              {/* Element selection dropdown */}
              <FormControl
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.75rem',
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.75rem',
                    transform: 'translate(14px, 9px) scale(1)',
                    '&.MuiInputLabel-shrink': {
                      transform: 'translate(14px, -6px) scale(0.75)',
                    },
                  },
                  maxWidth: '100%',
                  mb: 1,
                }}
              >
                <InputLabel>Select element...</InputLabel>
                <Select
                  value={selectedElement}
                  label="Select element..."
                  disabled={!session.connected || androidElements.length === 0}
                  sx={{
                    '& .MuiSelect-select': {
                      py: 0.75,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                  onChange={(e) => {
                    const elementId = e.target.value as string;
                    const element = androidElements.find((el) => el.id === elementId);
                    if (element) {
                      setSelectedElement(element.id);
                      handleOverlayElementClick(element);
                    }
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 200,
                        width: 'auto',
                        maxWidth: '100%',
                      },
                    },
                    // Prevent dropdown from affecting page scrollbar
                    disableScrollLock: true,
                    keepMounted: false,
                  }}
                >
                  {androidElements.map((element) => (
                    <MenuItem
                      key={element.id}
                      value={element.id}
                      sx={{
                        fontSize: '0.75rem',
                        py: 0.5,
                        px: 1,
                        minHeight: 'auto',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {getElementDisplayName(element)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Device Controls */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Device Controls
              </Typography>

              {/* System buttons */}
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('BACK')}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Back
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('HOME')}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Home
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('MENU')}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Menu
                </Button>
              </Box>

              {/* Volume controls */}
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('VOLUME_UP')}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Vol+
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('VOLUME_DOWN')}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Vol-
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('POWER')}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Power
                </Button>
              </Box>

              {/* Phone specific buttons */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('CAMERA')}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Camera
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('CALL')}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Call
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('ENDCALL')}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  End
                </Button>
              </Box>
            </Box>

            {/* Disconnect Button */}
            <Box sx={{ pt: 1, borderTop: '1px solid #e0e0e0' }}>
              <Button
                variant="contained"
                color="error"
                onClick={handleDisconnectWithCallback}
                disabled={isDisconnecting}
                fullWidth
              >
                Disconnect
              </Button>
            </Box>
          </Box>
        </Box>

        {/* AndroidMobileOverlay - Only visible when in stream mode and not minimized */}
        {panelInfo &&
          typeof document !== 'undefined' &&
          captureMode === 'stream' &&
          !streamMinimized &&
          createPortal(
            <AndroidMobileOverlay
              elements={androidElements} // Can be empty array when no UI dumped yet
              deviceWidth={1920} // Use hardcoded 1920x1080 consistently
              deviceHeight={1080} // Use hardcoded 1920x1080 consistently
              isVisible={true} // Visible when in stream mode and not minimized
              onElementClick={handleOverlayElementClick}
              panelInfo={panelInfo}
              onPanelTap={panelInfo ? handleStreamTap : undefined}
            />,
            document.body,
          )}

        {/* Debug info when panelInfo is missing */}
        {!panelInfo && (
          <div
            style={{
              position: 'fixed',
              top: '10px',
              right: '10px',
              background: 'red',
              color: 'white',
              padding: '10px',
              borderRadius: '4px',
              zIndex: 999999,
              fontSize: '12px',
              maxWidth: '300px',
            }}
          >
            <strong>Overlay Debug:</strong>
            <br />
            Elements: {androidElements.length}
            <br />
            ShowOverlay: {showOverlay.toString()}
            <br />
            StreamPosition: undefined
            <br />
            StreamSize: undefined
            <br />
            StreamResolution:{' '}
            {deviceResolution
              ? `${deviceResolution.width}x${deviceResolution.height}`
              : 'undefined'}
            <br />
            PanelState: {isCollapsed ? 'collapsed' : 'expanded'}
          </div>
        )}
      </Box>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if host object properties or stream props have actually changed
    return (
      prevProps.host?.host_name === nextProps.host?.host_name &&
      prevProps.host?.device_model === nextProps.host?.device_model &&
      prevProps.host?.device_ip === nextProps.host?.device_ip &&
      prevProps.onDisconnectComplete === nextProps.onDisconnectComplete &&
      JSON.stringify(prevProps.sx) === JSON.stringify(nextProps.sx) &&
      prevProps.isCollapsed === nextProps.isCollapsed &&
      prevProps.panelWidth === nextProps.panelWidth &&
      prevProps.panelHeight === nextProps.panelHeight &&
      JSON.stringify(prevProps.deviceResolution) === JSON.stringify(nextProps.deviceResolution) &&
      prevProps.streamCollapsed === nextProps.streamCollapsed &&
      prevProps.streamMinimized === nextProps.streamMinimized &&
      prevProps.captureMode === nextProps.captureMode
    );
  },
);
