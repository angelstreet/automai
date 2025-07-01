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

    // Clean context-based button layout selection
    const isRecModal = !!streamContainerDimensions;
    const buttonLayout = isRecModal
      ? layoutConfig.button_layout_recmodal
      : layoutConfig.button_layout;

    console.log(
      `[@component:AndroidTvRemote] Context: ${isRecModal ? 'rec modal' : 'floating panel'}, using ${isRecModal ? 'button_layout_recmodal' : 'button_layout'}`,
    );

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
            {Object.entries(buttonLayout).map(([buttonId, button]) => (
              <Box
                key={buttonId}
                sx={{
                  position: 'absolute',
                  left: `${button.position.x}px`,
                  top: `${button.position.y}px`,
                  width: `${button.size.width}px`,
                  height: `${button.size.height}px`,
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
                      fontSize: isRecModal ? '14px' : '16px',
                      fontWeight: 'bold',
                      color: 'white',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
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
