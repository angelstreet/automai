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
    panelWidth,
    panelHeight,
  }: AndroidTvRemoteProps) {
    const { session, isLoading, lastAction, handleConnect, handleDisconnect, handleRemoteCommand } =
      useAndroidTv(host);

    const [remoteScale, setRemoteScale] = useState(0.43);
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

    // Adjust scale based on panel state
    useEffect(() => {
      if (isCollapsed) {
        setRemoteScale(0.25);
      } else {
        setRemoteScale(localRemoteConfig.remote_info.default_scale);
      }
    }, [isCollapsed, localRemoteConfig.remote_info.default_scale]);

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
              width: `${640 * remoteScale}px`,
              height: `${1800 * remoteScale}px`,
              backgroundImage: `url(${localRemoteConfig.remote_info.image_url})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              transform: `scale(${isCollapsed ? 0.7 : 1})`,
              transformOrigin: 'center center',
            }}
          >
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
        sx={{ ...sx, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      >
        {/* Status and controls */}
        {!isCollapsed && session.connected && (
          <Box sx={{ p: 1, borderBottom: '1px solid #e0e0e0' }}>
            {/* Status line */}
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
              {lastAction || 'Ready'}
            </Typography>

            {/* Controls */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              <Button
                variant={showOverlays ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setShowOverlays(!showOverlays)}
                sx={{ flex: 1, fontSize: '0.6rem', py: 0.5 }}
              >
                {showOverlays ? 'Hide Labels' : 'Show Labels'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Remote Interface */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>{renderRemoteInterface()}</Box>

        {/* Disconnect Button */}
        {!isCollapsed && session.connected && (
          <Box sx={{ p: 1, borderTop: '1px solid #e0e0e0' }}>
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
