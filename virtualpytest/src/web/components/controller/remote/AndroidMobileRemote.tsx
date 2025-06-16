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

import { AndroidMobileOverlay } from './AndroidMobileOverlay';

interface AndroidMobileRemoteProps {
  host: Host;
  onDisconnectComplete?: () => void;
  sx?: any;
  // Stream integration props - make remote autonomous
  streamPosition?: { x: number; y: number };
  streamSize?: { width: number; height: number };
  streamResolution?: { width: number; height: number };
  videoElement?: HTMLVideoElement;
}

export const AndroidMobileRemote = React.memo(
  function AndroidMobileRemote({
    host,
    onDisconnectComplete,
    sx = {},
    streamPosition,
    streamSize,
    streamResolution,
    videoElement,
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

    // Stream integration - prepare streamInfo for overlay
    const streamInfo = React.useMemo(() => {
      if (streamPosition && streamSize && streamResolution && videoElement) {
        return {
          videoElement,
          position: streamPosition,
          size: streamSize,
          deviceResolution: streamResolution,
        };
      }
      return undefined;
    }, [streamPosition, streamSize, streamResolution, videoElement]);

    // Use remote configs for stream tap functionality
    const { handleStreamTap } = useRemoteConfigs({
      host,
      streamInfo,
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
        displayName = `${el.className?.split('.').pop() || 'Unknown'} #${el.id}`;
      }

      // Limit display name length
      if (displayName.length > 30) {
        return displayName.substring(0, 27) + '...';
      }
      return displayName;
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

        {/* AndroidMobileOverlay - positioned outside or over stream */}
        {showOverlay && androidElements.length > 0 && (
          <div
            style={{
              position: streamInfo ? 'absolute' : 'fixed',
              left: streamInfo
                ? streamInfo.position.x
                : layoutConfig.overlayConfig.defaultPosition.left,
              top: streamInfo
                ? streamInfo.position.y
                : layoutConfig.overlayConfig.defaultPosition.top,
              width: streamInfo ? streamInfo.size.width : undefined,
              height: streamInfo ? streamInfo.size.height : undefined,
              zIndex: 99999999,
              pointerEvents: 'all',
              transformOrigin: 'top left',
              transform: streamInfo
                ? 'none'
                : `scale(${layoutConfig.overlayConfig.defaultScale.x}, ${layoutConfig.overlayConfig.defaultScale.y})`,
              background: 'rgba(0,0,0,0.01)',
              // Prevent overlay from affecting page layout
              contain: 'layout style size',
              willChange: 'transform',
            }}
          >
            <AndroidMobileOverlay
              elements={androidElements}
              screenshotElement={screenshotRef.current}
              deviceWidth={layoutConfig.deviceResolution.width}
              deviceHeight={layoutConfig.deviceResolution.height}
              isVisible={showOverlay}
              selectedElementId={selectedElement ? selectedElement : undefined}
              onElementClick={handleOverlayElementClick}
              streamInfo={streamInfo}
              onStreamTap={streamInfo ? handleStreamTap : undefined}
            />
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
      JSON.stringify(prevProps.streamPosition) === JSON.stringify(nextProps.streamPosition) &&
      JSON.stringify(prevProps.streamSize) === JSON.stringify(nextProps.streamSize) &&
      JSON.stringify(prevProps.streamResolution) === JSON.stringify(nextProps.streamResolution) &&
      prevProps.videoElement === nextProps.videoElement
    );
  },
);
