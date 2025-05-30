import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useAndroidTVConnection } from '../../hooks/remote/useAndroidTVConnection';
import { RemoteInterface } from './RemoteInterface';

interface CompactAndroidTVRemoteProps {
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
  /** Show/hide screenshot display */
  showScreenshot?: boolean;
  /** Custom styling */
  sx?: any;
  /** Callback when disconnect is complete (for parent to handle additional actions like closing panel) */
  onDisconnectComplete?: () => void;
}

export function CompactAndroidTVRemote({
  connectionConfig,
  autoConnect = false,
  showScreenshot = true,
  sx = {},
  onDisconnectComplete
}: CompactAndroidTVRemoteProps) {
  // UI state (only what's specific to the compact version)
  const [showOverlays, setShowOverlays] = useState(false);

  // Use the Android TV connection hook - it handles all the business logic
  const {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    handleTakeControl,
    handleReleaseControl,
    handleRemoteCommand,
    fetchDefaultValues,
    remoteConfig,
  } = useAndroidTVConnection();

  // Initialize connection form with provided config or fetch defaults
  useEffect(() => {
    if (connectionConfig) {
      console.log('[@component:CompactAndroidTVRemote] Initializing with provided config');
      setConnectionForm({
        host_ip: connectionConfig.host_ip,
        host_port: connectionConfig.host_port || '22',
        host_username: connectionConfig.host_username,
        host_password: connectionConfig.host_password,
        device_ip: connectionConfig.device_ip,
        device_port: connectionConfig.device_port || '5555',
      });
    } else {
      console.log('[@component:CompactAndroidTVRemote] No config provided, fetching defaults');
      fetchDefaultValues();
    }
  }, [connectionConfig, fetchDefaultValues, setConnectionForm]);

  // Auto-connect logic - simplified since hook handles validation and connection
  useEffect(() => {
    if (connectionConfig && autoConnect && !session.connected && !connectionLoading) {
      console.log('[@component:CompactAndroidTVRemote] Auto-connecting...');
      // Small delay to ensure connection form is set
      const timer = setTimeout(() => {
        handleTakeControl();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [connectionConfig, autoConnect, session.connected, connectionLoading, handleTakeControl]);

  // Handle disconnect with callback
  const handleDisconnect = async () => {
    try {
      await handleReleaseControl();
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    } catch (error) {
      console.error('[@component:CompactAndroidTVRemote] Error during disconnect:', error);
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

  // Get the scale from the remote config or fall back to 1
  const remoteScale = remoteConfig?.remote_info.default_scale || 1;
  
  // Dynamic width based on remote scale
  const containerWidth = 130 * remoteScale;

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
      ...sx 
    }}>
      {/* Show Overlays button - positioned in top right corner */}
      <Box sx={{ 
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 10,
        m: 1
      }}>
        <Button
          variant={showOverlays ? "contained" : "outlined"}
          size="small"
          onClick={() => setShowOverlays(!showOverlays)}
          sx={{ 
            minWidth: 'auto', 
            px: 1, 
            fontSize: '0.7rem',
            opacity: 0.7,
            '&:hover': { opacity: 1 }
          }}
        >
          {showOverlays ? 'Hide Overlay' : 'Show Overlay'}
        </Button>
      </Box>
      
      {/* Remote Interface Container - positioned at the top */}
      <Box sx={{ 
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${containerWidth}px`,
      }}>
        <RemoteInterface
          remoteConfig={remoteConfig || null}
          scale={remoteScale}
          showOverlays={showOverlays}
          onCommand={handleRemoteCommand}
          fallbackImageUrl="/android-tv-remote.png"
          fallbackName="Android TV Remote"
        />
      </Box>

      {/* Disconnect button */}
      <Button 
        variant="contained" 
        color="error"
        onClick={handleDisconnect}
        disabled={connectionLoading}
        size="small"
        fullWidth
        sx={{ 
          mt: 0, 
          height: '28px',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0
        }}
      >
        {connectionLoading ? <CircularProgress size={16} /> : 'Disconnect'}
      </Button>
    </Box>
  );
} 