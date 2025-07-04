import { Box, Button, Typography, CircularProgress } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { useAndroidTv } from '../../../hooks/controller/useAndroidTv';
import { Host } from '../../../types/common/Host_Types';

interface AndroidTvRemoteProps {
  host: Host;
  deviceId?: string;
  isConnected?: boolean;
  onDisconnectComplete?: () => void;
  sx?: any;
  isCollapsed: boolean;
  streamContainerDimensions?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

export const AndroidTvRemote = React.memo(
  function AndroidTvRemote({
    host,
    deviceId,
    isConnected,
    onDisconnectComplete,
    sx = {},
    isCollapsed,
    streamContainerDimensions,
  }: AndroidTvRemoteProps) {
    const {
      session,
      isLoading,
      layoutConfig,
      handleConnect,
      handleDisconnect,
      handleRemoteCommand,
    } = useAndroidTv(host, deviceId, isConnected);

    const [showOverlays, setShowOverlays] = useState(!isCollapsed);

    // Update showOverlays when isCollapsed changes
    useEffect(() => {
      setShowOverlays(!isCollapsed);
    }, [isCollapsed]);

    const handleDisconnectWithCallback = async () => {
      await handleDisconnect();
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    };

    // Handle button press with visual feedback
    const handleButtonPress = async (buttonKey: string) => {
      if (isLoading || !session.connected) return;

      console.log(`[@component:AndroidTvRemote] Button pressed: ${buttonKey}`);
      await handleRemoteCommand(buttonKey);
    };

    // Calculate responsive remote scale based on available space
    const calculateRemoteScale = () => {
      // Base remote dimensions from config
      const baseHeight = 1800;

      // Determine available height based on context
      let availableHeight: number;

      if (streamContainerDimensions) {
        // Modal context: use the modal's stream container height
        // Reserve space for disconnect button (60px) and some padding
        availableHeight = streamContainerDimensions.height - 120;
        console.log(
          `[@component:AndroidTvRemote] Using modal container height: ${streamContainerDimensions.height}, available: ${availableHeight}`,
        );
      } else {
        // Floating panel context: use window height
        availableHeight = window.innerHeight - 120; // Reserve space for disconnect button
        console.log(
          `[@component:AndroidTvRemote] Using window height: ${window.innerHeight}, available: ${availableHeight}`,
        );
      }

      // Calculate the base scale from available height
      const baseScale = availableHeight / baseHeight;

      if (isCollapsed) {
        // For collapsed state, apply panel ratio reduction to the base scale
        const collapsedHeight = parseInt(
          layoutConfig.panel_layout.collapsed.height.replace('px', ''),
          10,
        );
        const expandedHeight = parseInt(
          layoutConfig.panel_layout.expanded.height.replace('px', ''),
          10,
        );
        const collapsedWidth = parseInt(
          layoutConfig.panel_layout.collapsed.width.replace('px', ''),
          10,
        );
        const expandedWidth = parseInt(
          layoutConfig.panel_layout.expanded.width.replace('px', ''),
          10,
        );

        // Calculate scale ratio based on panel size difference
        const heightRatio = collapsedHeight / expandedHeight; // 300/600 = 0.5
        const widthRatio = collapsedWidth / expandedWidth; // 160/240 = 0.667

        // Use the smaller ratio to ensure remote fits in collapsed panel
        const panelReductionRatio = Math.min(heightRatio, widthRatio);

        // Apply the reduction ratio to the base scale
        const collapsedScale = baseScale * panelReductionRatio;

        return collapsedScale;
      }

      return baseScale;
    };

    const remoteScale = calculateRemoteScale();

    // Render remote interface with clickable buttons
    const renderRemoteInterface = () => {
      if (!session.connected) {
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
            <Box sx={{ textAlign: 'center' }}>
              {session.connecting ? (
                <>
                  <CircularProgress size={24} sx={{ mb: 1 }} />
                  <Typography variant="body2">Connecting...</Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="textSecondary">
                    {session.error || 'Android TV Remote'}
                  </Typography>
                  <Button variant="outlined" size="small" onClick={handleConnect} sx={{ mt: 1 }}>
                    Connect
                  </Button>
                </>
              )}
            </Box>
          </Box>
        );
      }

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Hide/Show Labels Toggle Overlay Button - Panel Top Right */}
          {!isCollapsed && session.connected && (
            <Button
              variant="contained"
              size="small"
              onClick={() => setShowOverlays(!showOverlays)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                fontSize: '0.6rem',
                px: 1,
                py: 0.5,
                minWidth: 'auto',
                zIndex: 10,
              }}
            >
              {showOverlays ? 'Hide' : 'Show'}
            </Button>
          )}

          {/* Remote container with image background */}
          <Box
            sx={{
              position: 'relative',
              width: 'auto',
              height: '100%',
              aspectRatio: '640/1800',
              backgroundImage: `url(${layoutConfig.remote_info.image_url})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          >
            {/* Render clickable button overlays */}
            {Object.entries(
              streamContainerDimensions
                ? layoutConfig.button_layout_recmodal
                : layoutConfig.button_layout,
            ).map(([buttonId, button]) => (
              <Box
                key={buttonId}
                sx={{
                  position: 'absolute',
                  left: `${button.position.x * remoteScale}px`,
                  top: `${button.position.y * remoteScale}px`,
                  width: `${button.size.width * layoutConfig.remote_info.button_scale_factor * remoteScale}px`,
                  height: `${button.size.height * layoutConfig.remote_info.button_scale_factor * remoteScale}px`,
                  borderRadius: button.shape === 'circle' ? '50%' : '4px',
                  backgroundColor:
                    !isCollapsed && showOverlays ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  border:
                    !isCollapsed && showOverlays ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'scale(1.05)',
                  },
                  '&:active': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    transform: 'scale(0.95)',
                  },
                }}
                onClick={() => handleButtonPress(button.key)}
                title={`${button.label} - ${button.comment}`}
              >
                {!isCollapsed && showOverlays && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: `${parseInt(layoutConfig.remote_info.text_style.fontSize) * remoteScale}px`,
                      fontWeight: layoutConfig.remote_info.text_style.fontWeight,
                      color: layoutConfig.remote_info.text_style.color,
                      textShadow: layoutConfig.remote_info.text_style.textShadow,
                      userSelect: 'none',
                    }}
                  >
                    {button.label}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      );
    };

    return (
      <Box
        sx={{
          ...sx,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Remote Interface - takes most of the space */}
        <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>{renderRemoteInterface()}</Box>

        {/* Disconnect Button - fixed at bottom */}
        {!isCollapsed && session.connected && (
          <Box
            sx={{
              p: 1,
              borderTop: '1px solid #e0e0e0',
              backgroundColor: 'background.paper',
              position: 'sticky',
              bottom: 0,
              zIndex: 5,
            }}
          >
            <Button
              variant="contained"
              color="error"
              onClick={handleDisconnectWithCallback}
              disabled={isLoading}
              fullWidth
              size="small"
              sx={{ fontSize: '0.7rem' }}
            >
              Disconnect
            </Button>
          </Box>
        )}
      </Box>
    );
  },
  (prevProps, nextProps) => {
    // Memoization to prevent unnecessary re-renders
    return (
      prevProps.host?.host_name === nextProps.host?.host_name &&
      prevProps.deviceId === nextProps.deviceId &&
      prevProps.isConnected === nextProps.isConnected &&
      prevProps.onDisconnectComplete === nextProps.onDisconnectComplete &&
      JSON.stringify(prevProps.sx) === JSON.stringify(nextProps.sx) &&
      prevProps.isCollapsed === nextProps.isCollapsed &&
      JSON.stringify(prevProps.streamContainerDimensions) ===
        JSON.stringify(nextProps.streamContainerDimensions)
    );
  },
);
