import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Grid,
  Paper,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Android, Settings, Tv } from '@mui/icons-material';
import { useAndroidTVConnection } from '../../hooks/remote/useAndroidTVConnection';
import { RemoteInterface } from './RemoteInterface';

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
  /** Callback when disconnect is complete (for parent to handle additional actions like closing panel) */
  onDisconnectComplete?: () => void;
}

export function AndroidTVRemotePanel({
  connectionConfig,
  autoConnect = false,
  compact = false,
  showScreenshot = true,
  sx = {},
  onDisconnectComplete
}: AndroidTVRemotePanelProps) {
  // UI state
  const [showOverlays, setShowOverlays] = useState(false);
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
      console.log('[@component:AndroidTVRemotePanel] Initializing connection form with config:', connectionConfig);
      setConnectionForm({
        host_ip: connectionConfig.host_ip,
        host_port: connectionConfig.host_port || '22',
        host_username: connectionConfig.host_username,
        host_password: connectionConfig.host_password,
        device_ip: connectionConfig.device_ip,
        device_port: connectionConfig.device_port || '5555',
      });
    } else {
      console.log('[@component:AndroidTVRemotePanel] No connection config provided, fetching defaults');
      fetchDefaultValues();
    }
  }, [connectionConfig, fetchDefaultValues, setConnectionForm]);

  // Auto-connect if config is provided and autoConnect is true
  useEffect(() => {
    if (connectionConfig && autoConnect && !session.connected && !connectionLoading) {
      // Validate that we have all required connection parameters
      const requiredFields: (keyof typeof connectionConfig)[] = ['host_ip', 'host_username', 'host_password', 'device_ip'];
      const missingFields = requiredFields.filter(field => !connectionConfig[field]);
      
      if (missingFields.length > 0) {
        console.error('[@component:AndroidTVRemotePanel] Missing required connection fields:', missingFields);
        console.error('[@component:AndroidTVRemotePanel] Connection config:', connectionConfig);
        return;
      }
      
      console.log('[@component:AndroidTVRemotePanel] Auto-connecting with provided config:', {
        host_ip: connectionConfig.host_ip,
        device_ip: connectionConfig.device_ip,
        host_username: connectionConfig.host_username,
        // Don't log password for security
      });
      
      // Add a small delay to ensure connection form is set
      setTimeout(() => {
        handleTakeControl();
      }, 100);
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
        p: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        ...sx 
      }}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Android TV Not Connected
        </Typography>
        
        {/* Show connection status or connect button */}
        {connectionLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="info.main">
              Connecting...
            </Typography>
          </Box>
        ) : connectionConfig ? (
          <Button
            variant="contained"
            onClick={handleTakeControl}
            disabled={connectionLoading}
            size="small"
            sx={{ mb: 2 }}
          >
            Connect
          </Button>
        ) : (
          <Typography variant="caption" color="warning.main" textAlign="center" sx={{ mb: 2 }}>
            No device configuration
          </Typography>
        )}
        
        {/* Show connection error if any */}
        {connectionError && (
          <Box sx={{ 
            mt: 1, 
            p: 1, 
            bgcolor: 'error.light', 
            borderRadius: 1, 
            maxWidth: '100%',
            wordBreak: 'break-word'
          }}>
            <Typography variant="caption" color="error" textAlign="center">
              {connectionError}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 2, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'hidden', // Prevent scrolling
      ...sx 
    }}>
      {/* Remote Control Interface */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100%',
        position: 'relative', // Add relative positioning for absolute child
        overflow: 'hidden' // Prevent scrolling
      }}>
        {/* Show Overlays button - positioned in top right corner */}
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 10, // Ensure it's above the remote
          m: 1 // Margin to prevent it from being right at the edge
        }}>
          <Button
            variant={showOverlays ? "contained" : "outlined"}
            size="small"
            onClick={() => setShowOverlays(!showOverlays)}
            sx={{ 
              minWidth: 'auto', 
              px: 1, 
              fontSize: '0.7rem',
              opacity: 0.7, // Slightly transparent
              '&:hover': { opacity: 1 } // Full opacity on hover
            }}
          >
            {showOverlays ? 'Hide Overlay' : 'Show Overlay'}
          </Button>
        </Box>
        
        {/* Remote Interface */}
        <Box sx={{ 
          position: 'relative',
          height: '100%'
        }}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}>
            <RemoteInterface
              remoteConfig={localRemoteConfig}
              scale={1}
              showOverlays={showOverlays}
              onCommand={handleRemoteCommand}
              fallbackImageUrl="/android-tv-remote.png"
              fallbackName="Android TV Remote"
            />
          </Box>
        </Box>
      </Box>

      {/* Disconnect button */}
      <Button 
        variant="contained" 
        color="error"
        onClick={async () => {
          try {
            await handleReleaseControl();
            // Call the callback after successful disconnect
            if (onDisconnectComplete) {
              onDisconnectComplete();
            }
          } catch (error) {
            console.error('[@component:AndroidTVRemotePanel] Error during disconnect:', error);
          }
        }}
        disabled={connectionLoading}
        size="small"
        fullWidth
        sx={{ mt: 1, height: '32px' }} // Fixed height
      >
        {connectionLoading ? <CircularProgress size={16} /> : 'Disconnect'}
      </Button>
    </Box>
  );
} 