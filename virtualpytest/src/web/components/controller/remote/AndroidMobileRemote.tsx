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
import { createPortal } from 'react-dom';

import { hdmiStreamMobileConfig, HDMI_STREAM_HEADER_HEIGHT } from '../../../config/av/hdmiStream';
import { useAndroidMobile } from '../../../hooks/controller/useAndroidMobile';
import { Host } from '../../../types/common/Host_Types';
import { PanelInfo } from '../../../types/controller/Panel_Types';
import { AndroidElement } from '../../../types/controller/Remote_Types';

import { AndroidMobileOverlay } from './AndroidMobileOverlay';

interface AndroidMobileRemoteProps {
  host: Host;
  deviceId: string; // Device ID to select the correct device and make API calls
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
  // NEW: Stream container dimensions for modal context
  streamContainerDimensions?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

export const AndroidMobileRemote = React.memo(
  function AndroidMobileRemote({
    host,
    deviceId,
    onDisconnectComplete,
    sx = {},
    isCollapsed,
    panelWidth,
    panelHeight,
    deviceResolution,
    streamCollapsed,
    streamMinimized = false,
    captureMode = 'stream',
    streamContainerDimensions,
  }: AndroidMobileRemoteProps) {
    const hookResult = useAndroidMobile(host, deviceId);

    const {
      // State
      androidElements,
      androidApps,
      selectedElement,
      selectedApp,
      isDumpingUI,
      isDisconnecting,
      isRefreshingApps,

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
    } = hookResult;

    // Debug logging for elements state
    React.useEffect(() => {
      // Only log when elements count changes significantly or when there are errors
      if (androidElements.length > 0 && androidElements.length % 10 === 0) {
        console.log('[@component:AndroidMobileRemote] Elements loaded:', androidElements.length);
      }
    }, [androidElements]);

    // Panel integration - prepare panelInfo for overlay
    const panelInfo: PanelInfo | undefined = React.useMemo(() => {
      // Skip unnecessary recalculations if missing required props
      if (!panelWidth || !panelHeight || !deviceResolution) {
        return undefined;
      }

      // NEW: Use stream container dimensions if provided (modal context)
      if (streamContainerDimensions) {
        const info = {
          position: {
            x: streamContainerDimensions.x,
            y: streamContainerDimensions.y,
          },
          size: {
            width: streamContainerDimensions.width,
            height: streamContainerDimensions.height,
          },
          deviceResolution: { width: 1920, height: 1080 }, // Keep HDMI resolution for overlay positioning
          isCollapsed: false, // In modal context, stream is always expanded
        };
        return info;
      }

      // EXISTING: Use HDMI stream config for floating panel context
      // Keep HDMI stream resolution for overlay positioning (visual alignment)
      const hdmiStreamResolution = { width: 1920, height: 1080 };

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

      // Calculate stream width based on 1920x1080 aspect ratio (16:9)
      // For mobile: height is reference, divide by ratio to get width
      const deviceAspectRatio = 1920 / 1080; // 16:9 = 1.777...
      const streamContentWidth = streamContentHeight / deviceAspectRatio;

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
        deviceResolution: hdmiStreamResolution, // Keep HDMI resolution for overlay positioning
        isCollapsed: streamCollapsed ?? true, // Use stream collapsed state directly, default to collapsed
      };
      return info;
    }, [
      isCollapsed,
      panelWidth,
      panelHeight,
      deviceResolution,
      streamCollapsed,
      streamContainerDimensions,
    ]);

    const handleDisconnectWithCallback = async () => {
      await handleDisconnect();
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    };

    const getElementDisplayName = (el: AndroidElement): string => {
      let displayName = '';

      // Ensure el and el.id are valid
      if (!el || !el.id) {
        return 'Invalid Element';
      }

      // Debug logging for first few elements (only for development)
      // if (parseInt(String(el.id)) <= 3) {
      //   console.log(`[@component:AndroidMobileRemote] Element ${el.id} debug:`, {
      //     contentDesc: el.contentDesc,
      //     text: el.text,
      //     className: el.className,
      //   });
      // }

      // Priority: ContentDesc → Text → Class Name (same as UIElementsOverlay)
      // Ensure we're working with strings and handle null/undefined safely
      if (
        el.contentDesc &&
        typeof el.contentDesc === 'string' &&
        el.contentDesc !== '<no content-desc>' &&
        el.contentDesc.trim() !== ''
      ) {
        displayName = String(el.contentDesc);
      } else if (
        el.text &&
        typeof el.text === 'string' &&
        el.text !== '<no text>' &&
        el.text.trim() !== ''
      ) {
        displayName = `"${String(el.text)}"`;
      } else {
        const className =
          el.className && typeof el.className === 'string'
            ? el.className.split('.').pop()
            : 'Unknown';
        displayName = String(className || 'Unknown');
      }

      // Prepend element ID with compact format, ensuring both parts are strings
      const fullDisplayName = `${String(el.id)}.${String(displayName)}`;

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
                    console.log('[@component:AndroidMobileRemote] Select onChange:', {
                      elementId,
                      selectedElement,
                      androidElementsCount: androidElements.length,
                    });
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
                  {(() => {
                    console.log('[@component:AndroidMobileRemote] Rendering MenuItems:', {
                      selectedElement,
                      androidElementsCount: androidElements.length,
                      firstFewElements: androidElements.slice(0, 3).map((el) => ({
                        id: el.id,
                        contentDesc: el.contentDesc,
                        text: el.text,
                      })),
                    });
                    return androidElements
                      .filter((element) => element && element.id) // Filter out invalid elements
                      .map((element) => {
                        return (
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
                        );
                      });
                  })()}
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

        {/* AndroidMobileOverlay - Only visible when in stream mode (not during screenshot/video capture) and not minimized */}
        {panelInfo &&
        typeof document !== 'undefined' &&
        captureMode === 'stream' &&
        !streamMinimized
          ? createPortal(
              <AndroidMobileOverlay
                elements={androidElements} // Can be empty array when no UI dumped yet
                deviceWidth={1080} // Use actual Android device resolution from ADB
                deviceHeight={2340} // Use actual Android device resolution from ADB
                isVisible={captureMode === 'stream' && !streamMinimized} // Only visible in stream mode, not during screenshot/video capture
                onElementClick={handleOverlayElementClick}
                panelInfo={panelInfo}
                host={host}
              />,
              document.body,
            )
          : null}
      </Box>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    const hostChanged = JSON.stringify(prevProps.host) !== JSON.stringify(nextProps.host);
    const sxChanged = JSON.stringify(prevProps.sx) !== JSON.stringify(nextProps.sx);
    const isCollapsedChanged = prevProps.isCollapsed !== nextProps.isCollapsed;
    const panelWidthChanged = prevProps.panelWidth !== nextProps.panelWidth;
    const panelHeightChanged = prevProps.panelHeight !== nextProps.panelHeight;
    const deviceResolutionChanged =
      JSON.stringify(prevProps.deviceResolution) !== JSON.stringify(nextProps.deviceResolution);
    const streamCollapsedChanged = prevProps.streamCollapsed !== nextProps.streamCollapsed;
    const streamMinimizedChanged = prevProps.streamMinimized !== nextProps.streamMinimized;
    const captureModeChanged = prevProps.captureMode !== nextProps.captureMode;
    const onDisconnectCompleteChanged =
      prevProps.onDisconnectComplete !== nextProps.onDisconnectComplete;
    const streamContainerDimensionsChanged =
      JSON.stringify(prevProps.streamContainerDimensions) !==
      JSON.stringify(nextProps.streamContainerDimensions);

    // Return true if props are equal (don't re-render), false if they changed (re-render)
    const shouldSkipRender =
      !hostChanged &&
      !sxChanged &&
      !isCollapsedChanged &&
      !panelWidthChanged &&
      !panelHeightChanged &&
      !deviceResolutionChanged &&
      !streamCollapsedChanged &&
      !streamMinimizedChanged &&
      !captureModeChanged &&
      !onDisconnectCompleteChanged &&
      !streamContainerDimensionsChanged;

    // Log only significant re-renders for debugging
    // if (!shouldSkipRender) {
    //   console.log(`[@component:AndroidMobileRemote] Re-rendering due to prop changes`);
    // }

    return shouldSkipRender;
  },
);
