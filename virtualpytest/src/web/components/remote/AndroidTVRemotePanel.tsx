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
    remoteConfig,
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

  // Fixed-size remote container - will be consistent across all usages
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'hidden',
      ...sx 
    }}>
      <Box sx={{ 
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
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
        
        {/* Fixed-size Remote Interface Container */}
        <Box sx={{ 
          width: '130px',  // Fixed width
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <RemoteInterface
            remoteConfig={remoteConfig || null}
            scale={1} // Use fixed scale of 1 regardless of config
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
        onClick={async () => {
          try {
            await handleReleaseControl();
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
        sx={{ mt: 0, height: '28px' }}
      >
        {connectionLoading ? <CircularProgress size={16} /> : 'Disconnect'}
      </Button>
    </Box>
  );
} 