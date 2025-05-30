import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useAndroidTVConnection } from '../../../pages/controller/hooks/useAndroidTVConnection';
import { RemoteInterface } from '../../../pages/controller/components/RemoteInterface';

interface AndroidTVRemotePanelProps {
  /** Optional pre-configured connection parameters */
  connectionConfig?: {
    host_ip: string;
    host_port?: string;
    host_username: string;
    host_password: string;
    device_ip: string;
    device_port?: string;
  };
  /** Whether to auto-connect on mount if config is provided */
  autoConnect?: boolean;
  /** Compact mode for smaller spaces like NavigationEditor */
  compact?: boolean;
  /** Show/hide screenshot display */
  showScreenshot?: boolean;
  /** Custom styling */
  sx?: any;
}

export function AndroidTVRemotePanel({
  connectionConfig,
  autoConnect = false,
  compact = false,
  showScreenshot = true,
  sx = {}
}: AndroidTVRemotePanelProps) {
  // UI state
  const [showOverlays, setShowOverlays] = useState(true);
  const [remoteScale, setRemoteScale] = useState(1.2);
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  // Use the Android TV connection hook
  const {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    androidScreenshot,
    handleTakeControl,
    handleReleaseControl,
    handleScreenshot,
    handleRemoteCommand,
    fetchDefaultValues,
  } = useAndroidTVConnection();

  // Initialize connection form with provided config
  useEffect(() => {
    if (connectionConfig) {
      setConnectionForm({
        host_ip: connectionConfig.host_ip,
        host_port: connectionConfig.host_port || '22',
        host_username: connectionConfig.host_username,
        host_password: connectionConfig.host_password,
        device_ip: connectionConfig.device_ip,
        device_port: connectionConfig.device_port || '5555',
      });
    } else {
      fetchDefaultValues();
    }
  }, [connectionConfig, fetchDefaultValues, setConnectionForm]);

  // Auto-connect if config is provided and autoConnect is true
  useEffect(() => {
    if (connectionConfig && autoConnect && !session.connected && !connectionLoading) {
      console.log('[@component:AndroidTVRemotePanel] Auto-connecting with provided config');
      handleTakeControl();
    }
  }, [connectionConfig, autoConnect, session.connected, connectionLoading, handleTakeControl]);

  // Local button layout configuration for Android TV remote
  const localRemoteConfig = {
    remote_info: {
      name: 'Fire TV Remote',
      type: 'android_tv',
      image_url: '/android-tv-remote.png',
      default_scale: compact ? 0.3 : 0.43,
      min_scale: 0.2,
      max_scale: compact ? 0.6 : 1.0,
      button_scale_factor: 6,
      global_offset: { x: 0, y: 0 },
      text_style: {
        fontSize: compact ? '14px' : '24px',
        fontWeight: 'bold',
        color: 'white',
        textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
      }
    },
    button_layout: {
      power: {
        key: 'POWER',
        label: 'PWR',
        position: { x: 150, y: 150 },
        size: { width: 14, height: 14 },
        shape: 'circle',
        comment: 'Power button'
      },
      nav_up: {
        key: 'UP',
        label: '▲',
        position: { x: 320, y: 440 },
        size: { width: 18, height: 10 },
        shape: 'rectangle',
        comment: 'Navigation up'
      },
      nav_left: {
        key: 'LEFT',
        label: '◄',
        position: { x: 130, y: 610 },
        size: { width: 10, height: 18 },
        shape: 'rectangle',
        comment: 'Navigation left'
      },
      nav_center: {
        key: 'SELECT',
        label: 'OK',
        position: { x: 320, y: 610 },
        size: { width: 40, height: 40 },
        shape: 'circle',
        comment: 'Navigation center/select'
      },
      nav_right: {
        key: 'RIGHT',
        label: '►',
        position: { x: 500, y: 610 },
        size: { width: 10, height: 18 },
        shape: 'rectangle',
        comment: 'Navigation right'
      },
      nav_down: {
        key: 'DOWN',
        label: '▼',
        position: { x: 320, y: 780 },
        size: { width: 18, height: 10 },
        shape: 'rectangle',
        comment: 'Navigation down'
      },
      back: {
        key: 'BACK',
        label: '←',
        position: { x: 150, y: 940 },
        size: { width: 20, height: 20 },
        shape: 'circle',
        comment: 'Back button'
      },
      home: {
        key: 'HOME',
        label: '🏠',
        position: { x: 490, y: 940 },
        size: { width: 20, height: 20 },
        shape: 'circle',
        comment: 'Home button'
      },
      menu: {
        key: 'MENU',
        label: '☰',
        position: { x: 320, y: 940 },
        size: { width: 20, height: 20 },
        shape: 'circle',
        comment: 'Menu button'
      },
      rewind: {
        key: 'REWIND',
        label: '<<',
        position: { x: 150, y: 1100 },
        size: { width: 20, height: 20 },
        shape: 'circle',
        comment: 'Rewind button'
      },
      play_pause: {
        key: 'PLAY_PAUSE',
        label: '⏯',
        position: { x: 320, y: 1100 },
        size: { width: 20, height: 20 },
        shape: 'circle',
        comment: 'Play/pause button'
      },
      fast_forward: {
        key: 'FAST_FORWARD',
        label: '>>',
        position: { x: 490, y: 1100 },
        size: { width: 20, height: 20 },
        shape: 'circle',
        comment: 'Fast forward button'
      },
      volume_up: {
        key: 'VOLUME_UP',
        label: 'V+',
        position: { x: 320, y: 1270 },
        size: { width: 20, height: 20 },
        shape: 'circle',
        comment: 'Volume up button'
      },
      volume_down: {
        key: 'VOLUME_DOWN',
        label: 'V-',
        position: { x: 320, y: 1430 },
        size: { width: 20, height: 20 },
        shape: 'circle',
        comment: 'Volume down button'
      },
      mute: {
        key: 'VOLUME_MUTE',
        label: 'MUTE',
        position: { x: 320, y: 1600 },
        size: { width: 20, height: 20 },
        shape: 'circle',
        comment: 'Mute button'
      }
    }
  };

  // Initialize scale from config
  useEffect(() => {
    if (localRemoteConfig) {
      setRemoteScale(localRemoteConfig.remote_info.default_scale);
    }
  }, []);

  const handleScreenshotClick = async () => {
    setIsScreenshotLoading(true);
    setScreenshotError(null);
    try {
      console.log('[@component:AndroidTVRemotePanel] Screenshot button clicked');
      await handleScreenshot();
      console.log('[@component:AndroidTVRemotePanel] Screenshot captured successfully');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to take screenshot';
      setScreenshotError(errorMessage);
      console.error('[@component:AndroidTVRemotePanel] Screenshot failed:', error);
    } finally {
      setIsScreenshotLoading(false);
    }
  };

  // Connection status display
  if (!session.connected) {
    return (
      <Box sx={{ 
        p: compact ? 1 : 2, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        ...sx 
      }}>
        <Typography variant={compact ? "body2" : "h6"} color="textSecondary" gutterBottom>
          Android TV Not Connected
        </Typography>
        {connectionConfig ? (
          <Button
            variant="contained"
            onClick={handleTakeControl}
            disabled={connectionLoading}
            size={compact ? "small" : "medium"}
          >
            {connectionLoading ? <CircularProgress size={16} /> : 'Connect'}
          </Button>
        ) : (
          <Typography variant="caption" color="textSecondary" textAlign="center">
            Configure device parameters to enable Android TV remote control
          </Typography>
        )}
        {connectionError && (
          <Typography variant="caption" color="error" sx={{ mt: 1, textAlign: 'center' }}>
            {connectionError}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: compact ? 1 : 2, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'auto',
      ...sx 
    }}>
      {/* Screenshot Display (optional) */}
      {showScreenshot && (
        <Box sx={{ mb: 2 }}>
          <Typography variant={compact ? "subtitle2" : "h6"} gutterBottom>
            Screenshot
          </Typography>
          {androidScreenshot ? (
            <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <img
                src={`data:image/png;base64,${androidScreenshot}`}
                alt="Android TV Screenshot"
                style={{
                  maxWidth: '100%',
                  maxHeight: compact ? '150px' : '200px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </Box>
          ) : (
            <Box sx={{ 
              height: compact ? 120 : 150, 
              border: '2px dashed #ccc', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 1,
              mb: 1
            }}>
              <Typography variant="caption" color="textSecondary" textAlign="center">
                Take screenshot to see TV screen
              </Typography>
            </Box>
          )}
          
          {/* Screenshot Error Display */}
          {screenshotError && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
              <Typography variant="caption" color="error">{screenshotError}</Typography>
            </Box>
          )}

          {/* Screenshot Button */}
          <Button
            variant="contained"
            size="small"
            onClick={handleScreenshotClick}
            disabled={isScreenshotLoading}
            fullWidth
            sx={{ fontSize: compact ? '0.7rem' : '0.9rem', py: 0.5 }}
          >
            {isScreenshotLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircularProgress size={12} />
                <Typography variant="caption">Capturing...</Typography>
              </Box>
            ) : (
              'Screenshot'
            )}
          </Button>
        </Box>
      )}

      {/* Remote Control Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant={compact ? "subtitle2" : "h6"} gutterBottom>
          Remote Control
        </Typography>

        {/* Controls for overlay and scale (only show in non-compact mode or if requested) */}
        {!compact && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Show Overlays button */}
            <Button
              variant={showOverlays ? "contained" : "outlined"}
              size="small"
              onClick={() => setShowOverlays(!showOverlays)}
              sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
            >
              {showOverlays ? 'Hide Overlays' : 'Show Overlays'}
            </Button>
            
            {/* Scale controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                Scale:
              </Typography>
              <Button
                size="small"
                onClick={() => setRemoteScale(prev => Math.max(localRemoteConfig?.remote_info.min_scale || 0.2, prev - 0.1))}
                disabled={remoteScale <= (localRemoteConfig?.remote_info.min_scale || 0.2)}
                sx={{ minWidth: 16, width: 16, height: 16, p: 0, fontSize: '0.6rem' }}
              >
                -
              </Button>
              <Typography variant="caption" sx={{ minWidth: 24, textAlign: 'center', fontSize: '0.6rem' }}>
                {Math.round(remoteScale * 100)}%
              </Typography>
              <Button
                size="small"
                onClick={() => setRemoteScale(prev => Math.min(localRemoteConfig?.remote_info.max_scale || 1.0, prev + 0.1))}
                disabled={remoteScale >= (localRemoteConfig?.remote_info.max_scale || 1.0)}
                sx={{ minWidth: 16, width: 16, height: 16, p: 0, fontSize: '0.6rem' }}
              >
                +
              </Button>
            </Box>
          </Box>
        )}

        {/* Remote Interface */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          overflow: 'hidden',
          alignItems: 'flex-start',
          flex: 1,
          maxHeight: compact ? '300px' : '400px'
        }}>
          <RemoteInterface
            remoteConfig={localRemoteConfig}
            scale={remoteScale}
            showOverlays={showOverlays}
            onCommand={handleRemoteCommand}
            fallbackImageUrl="/android-tv-remote.png"
            fallbackName="Android TV Remote"
          />
        </Box>
      </Box>

      {/* Disconnect button */}
      <Button 
        variant="contained" 
        color="error"
        onClick={handleReleaseControl}
        disabled={connectionLoading}
        size="small"
        fullWidth
        sx={{ mt: 1 }}
      >
        {connectionLoading ? <CircularProgress size={16} /> : 'Disconnect'}
      </Button>
    </Box>
  );
} 