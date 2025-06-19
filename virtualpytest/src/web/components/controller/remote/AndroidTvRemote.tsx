import { Box, Button, Typography, CircularProgress } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { useAndroidTv } from '../../../hooks/controller/useAndroidTv';
import { Host } from '../../../types/common/Host_Types';

interface AndroidTvRemoteProps {
  host: Host;
  onDisconnectComplete?: () => void;
  sx?: any;
  isCollapsed: boolean;
  panelWidth: string;
  panelHeight: string;
}

export const AndroidTvRemote = React.memo(
  function AndroidTvRemote({
    host,
    onDisconnectComplete,
    sx = {},
    isCollapsed,
    panelWidth: _panelWidth,
    panelHeight: _panelHeight,
  }: AndroidTvRemoteProps) {
    const { session, isLoading, handleConnect, handleDisconnect, handleRemoteCommand } =
      useAndroidTv(host);

    const [showOverlays, setShowOverlays] = useState(true);

    // Auto-connect when component mounts
    useEffect(() => {
      if (!session.connected && !session.connecting) {
        handleConnect();
      }
    }, [session.connected, session.connecting, handleConnect]);

    // Local button layout configuration (from AndroidTVModal.tsx)
    const localRemoteConfig = {
      remote_info: {
        name: 'Fire TV Remote',
        type: 'android_tv',
        image_url: '/android-tv-remote.png',
        default_scale: 0.43,
        min_scale: 0.3,
        max_scale: 1.0,
        button_scale_factor: 6,
        global_offset: { x: 0, y: 0 },
        text_style: {
          fontSize: '24px',
          fontWeight: 'bold',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
        },
      },
      button_layout: {
        power: {
          key: 'POWER',
          label: 'PWR',
          position: { x: 150, y: 150 },
          size: { width: 14, height: 14 },
          shape: 'circle',
          comment: 'Power button',
        },
        nav_up: {
          key: 'UP',
          label: '▲',
          position: { x: 320, y: 440 },
          size: { width: 18, height: 10 },
          shape: 'rectangle',
          comment: 'Navigation up',
        },
        nav_left: {
          key: 'LEFT',
          label: '◄',
          position: { x: 130, y: 610 },
          size: { width: 10, height: 18 },
          shape: 'rectangle',
          comment: 'Navigation left',
        },
        nav_center: {
          key: 'SELECT',
          label: 'OK',
          position: { x: 320, y: 610 },
          size: { width: 40, height: 40 },
          shape: 'circle',
          comment: 'Navigation center/select',
        },
        nav_right: {
          key: 'RIGHT',
          label: '►',
          position: { x: 500, y: 610 },
          size: { width: 10, height: 18 },
          shape: 'rectangle',
          comment: 'Navigation right',
        },
        nav_down: {
          key: 'DOWN',
          label: '▼',
          position: { x: 320, y: 780 },
          size: { width: 18, height: 10 },
          shape: 'rectangle',
          comment: 'Navigation down',
        },
        back: {
          key: 'BACK',
          label: '←',
          position: { x: 150, y: 940 },
          size: { width: 20, height: 20 },
          shape: 'circle',
          comment: 'Back button',
        },
        home: {
          key: 'HOME',
          label: '🏠',
          position: { x: 490, y: 940 },
          size: { width: 20, height: 20 },
          shape: 'circle',
          comment: 'Home button',
        },
        menu: {
          key: 'MENU',
          label: '☰',
          position: { x: 320, y: 940 },
          size: { width: 20, height: 20 },
          shape: 'circle',
          comment: 'Menu button',
        },
        rewind: {
          key: 'REWIND',
          label: '<<',
          position: { x: 150, y: 1100 },
          size: { width: 20, height: 20 },
          shape: 'circle',
          comment: 'Rewind button',
        },
        play_pause: {
          key: 'PLAY_PAUSE',
          label: '⏯',
          position: { x: 320, y: 1100 },
          size: { width: 20, height: 20 },
          shape: 'circle',
          comment: 'Play/pause button',
        },
        fast_forward: {
          key: 'FAST_FORWARD',
          label: '>>',
          position: { x: 490, y: 1100 },
          size: { width: 20, height: 20 },
          shape: 'circle',
          comment: 'Fast forward button',
        },
        volume_up: {
          key: 'VOLUME_UP',
          label: 'V+',
          position: { x: 320, y: 1270 },
          size: { width: 20, height: 20 },
          shape: 'circle',
          comment: 'Volume up button',
        },
        volume_down: {
          key: 'VOLUME_DOWN',
          label: 'V-',
          position: { x: 320, y: 1430 },
          size: { width: 20, height: 20 },
          shape: 'circle',
          comment: 'Volume down button',
        },
        mute: {
          key: 'VOLUME_MUTE',
          label: 'MUTE',
          position: { x: 320, y: 1600 },
          size: { width: 20, height: 20 },
          shape: 'circle',
          comment: 'Mute button',
        },
      },
    };

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
      // Base remote dimensions
      const baseHeight = 1800;

      if (isCollapsed) {
        // For collapsed state, fit to available height with auto width
        const availableHeight = window.innerHeight - 60; // Small margin
        return availableHeight / baseHeight;
      }

      // For expanded state, also fit to available height minus disconnect button space
      const availableHeight = window.innerHeight - 120; // Reserve space for disconnect button
      return availableHeight / baseHeight;
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
          {/* Remote container with image background */}
          <Box
            sx={{
              position: 'relative',
              width: 'auto',
              height: '100%',
              aspectRatio: '640/1800',
              backgroundImage: `url(${localRemoteConfig.remote_info.image_url})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          >
            {/* Hide/Show Labels Toggle Overlay Button */}
            {!isCollapsed && (
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

            {/* Render clickable button overlays */}
            {Object.entries(localRemoteConfig.button_layout).map(([buttonId, button]) => (
              <Box
                key={buttonId}
                sx={{
                  position: 'absolute',
                  left: `${button.position.x * remoteScale}px`,
                  top: `${button.position.y * remoteScale}px`,
                  width: `${button.size.width * localRemoteConfig.remote_info.button_scale_factor * remoteScale}px`,
                  height: `${button.size.height * localRemoteConfig.remote_info.button_scale_factor * remoteScale}px`,
                  borderRadius: button.shape === 'circle' ? '50%' : '4px',
                  backgroundColor: showOverlays ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  border: showOverlays ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
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
                {showOverlays && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: `${12 * remoteScale}px`,
                      fontWeight: 'bold',
                      color: 'white',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
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
      prevProps.host?.device_model === nextProps.host?.device_model &&
      prevProps.host?.device_ip === nextProps.host?.device_ip &&
      prevProps.onDisconnectComplete === nextProps.onDisconnectComplete &&
      JSON.stringify(prevProps.sx) === JSON.stringify(nextProps.sx) &&
      prevProps.isCollapsed === nextProps.isCollapsed &&
      prevProps.panelWidth === nextProps.panelWidth &&
      prevProps.panelHeight === nextProps.panelHeight
    );
  },
);
