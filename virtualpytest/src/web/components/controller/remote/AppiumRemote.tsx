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
import { useAppiumRemote } from '../../../hooks/controller/useAppiumRemote';
import { Host } from '../../../types/common/Host_Types';
import { PanelInfo } from '../../../types/controller/Panel_Types';
import { AppiumElement } from '../../../types/controller/Remote_Types';

import { AppiumOverlay } from './AppiumOverlay';

interface AppiumRemoteProps {
  host: Host;
  deviceId: string;
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

export const AppiumRemote = React.memo(
  function AppiumRemote({
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
  }: AppiumRemoteProps) {
    const hookResult = useAppiumRemote(host, deviceId);

    const {
      // State
      appiumElements,
      appiumApps,
      showOverlay,
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
      console.log('[@component:AppiumRemote] Elements state changed:', {
        elementsCount: appiumElements.length,
        elements: appiumElements
          .slice(0, 3)
          .map((el) => ({ id: el.id, accessibility_id: el.accessibility_id, text: el.text })),
      });
    }, [appiumElements]);

    // Panel integration - prepare panelInfo for overlay
    const panelInfo: PanelInfo | undefined = React.useMemo(() => {
      // Skip unnecessary recalculations if missing required props
      if (!panelWidth || !panelHeight || !deviceResolution) {
        console.log('[@component:AppiumRemote] panelInfo is undefined - missing required props');
        return undefined;
      }

      console.log('[@component:AppiumRemote] PanelInfo debug:', {
        isCollapsed,
        panelWidth,
        panelHeight,
        deviceResolution,
        streamCollapsed,
        hasStreamContainerDimensions: !!streamContainerDimensions,
      });

      // NEW: Use stream container dimensions if provided (modal context)
      if (streamContainerDimensions) {
        console.log(
          '[@component:AppiumRemote] Using stream container dimensions for modal context:',
          streamContainerDimensions,
        );

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
        console.log('[@component:AppiumRemote] Created panelInfo for modal context:', info);
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

      // Debug logging for width calculation
      console.log(`[@component:AppiumRemote] Width calculation debug (floating panel):`, {
        streamCollapsed,
        configState: streamCollapsed ? 'collapsed' : 'expanded',
        streamPanelWidth,
        streamPanelHeight,
        headerHeight,
        streamContentHeight,
        deviceAspectRatio,
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
        deviceResolution: hdmiStreamResolution, // Keep HDMI resolution for overlay positioning
        isCollapsed: streamCollapsed ?? true, // Use stream collapsed state directly, default to collapsed
      };
      console.log('[@component:AppiumRemote] Created panelInfo for floating panel:', info);
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

    const getElementDisplayName = (el: AppiumElement) => {
      let displayName = '';

      // Debug logging for first few elements
      if (parseInt(el.id) <= 3) {
        console.log(`[@component:AppiumRemote] Element ${el.id} debug:`, {
          text: el.text,
          accessibility_id: el.accessibility_id,
          className: el.className,
        });
      }

      // Priority for iOS: Text → Accessibility ID → Class Name
      if (el.text && el.text !== '<no text>' && el.text.trim() !== '') {
        displayName = `"${el.text}"`;
      } else if (
        el.accessibility_id &&
        el.accessibility_id !== '<no accessibility-id>' &&
        el.accessibility_id.trim() !== ''
      ) {
        displayName = `${el.accessibility_id}`;
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
                App Launcher ({appiumApps.length} apps)
              </Typography>

              <Box sx={{ mb: 1, mt: 1 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select an app...</InputLabel>
                  <Select
                    value={selectedApp}
                    label="Select an app..."
                    disabled={appiumApps.length === 0 || isRefreshingApps}
                    onChange={(e) => {
                      const appIdentifier = e.target.value;
                      if (appIdentifier) {
                        setSelectedApp(appIdentifier);
                        handleRemoteCommand('launch_app', { app_identifier: appIdentifier });
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
                    {appiumApps.map((app) => (
                      <MenuItem
                        key={app.identifier}
                        value={app.identifier}
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
                UI Elements ({appiumElements.length})
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
                  disabled={appiumElements.length === 0}
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
                  disabled={!session.connected || appiumElements.length === 0}
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
                    console.log('[@component:AppiumRemote] Dropdown selection changed:', {
                      elementId,
                      availableElements: appiumElements.length,
                      elementIds: appiumElements.map((el) => el.id),
                    });
                    const element = appiumElements.find((el) => el.id === elementId);
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
                  {appiumElements.map((element) => {
                    console.log('[@component:AppiumRemote] Rendering dropdown item:', {
                      id: element.id,
                      displayName: getElementDisplayName(element),
                    });
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
                  })}
                </Select>
              </FormControl>
            </Box>

            {/* Device Controls - iOS Specific */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Device Controls
              </Typography>

              {/* iOS System buttons */}
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('press_key', { key: 'HOME' })}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Home
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('press_key', { key: 'POWER' })}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Power
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('press_key', { key: 'CAMERA' })}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Camera
                </Button>
              </Box>

              {/* Volume controls */}
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('press_key', { key: 'VOLUME_UP' })}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Vol+
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemoteCommand('press_key', { key: 'VOLUME_DOWN' })}
                  disabled={!session.connected}
                  sx={{ flex: 1 }}
                >
                  Vol-
                </Button>
                {/* Empty third button for symmetry */}
                <Box sx={{ flex: 1 }}></Box>
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

        {/* AppiumOverlay - Only visible when in stream mode (not during screenshot/video capture) and not minimized */}
        {panelInfo &&
          typeof document !== 'undefined' &&
          captureMode === 'stream' &&
          !streamMinimized &&
          createPortal(
            <AppiumOverlay
              elements={appiumElements} // Can be empty array when no UI dumped yet
              deviceWidth={1080} // Use same device resolution as Android for now
              deviceHeight={2340} // Use same device resolution as Android for now
              isVisible={captureMode === 'stream' && !streamMinimized} // Only visible in stream mode, not during screenshot/video capture
              onElementClick={handleOverlayElementClick}
              panelInfo={panelInfo}
              host={host}
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
            Elements: {appiumElements.length}
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

    if (!shouldSkipRender) {
      console.log(`[@component:AppiumRemote] Re-rendering due to prop changes:`, {
        hostChanged,
        sxChanged,
        isCollapsedChanged,
        panelWidthChanged,
        panelHeightChanged,
        deviceResolutionChanged,
        streamCollapsedChanged,
        streamMinimizedChanged,
        captureModeChanged,
        onDisconnectCompleteChanged,
        streamContainerDimensionsChanged,
      });
    }

    return shouldSkipRender;
  },
);
