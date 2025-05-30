import React, { useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useAndroidTVConnection } from '../../hooks/remote/useAndroidTVConnection';
import { AndroidTVRemoteCore } from './AndroidTVRemoteCore';

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
  // Use the Android TV connection hook - single source of truth
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

  // Track if we've already initialized to prevent duplicate calls
  const isInitializedRef = useRef(false);
  const configHashRef = useRef<string>('');

  // Create a stable hash of the connection config to detect changes
  const createConfigHash = useCallback((config: typeof connectionConfig) => {
    if (!config) return '';
    return `${config.host_ip}-${config.host_port}-${config.host_username}-${config.device_ip}-${config.device_port}`;
  }, []);

  // Initialize connection form with provided config or fetch defaults
  useEffect(() => {
    const currentConfigHash = createConfigHash(connectionConfig);
    
    // Only initialize if config has actually changed or we haven't initialized yet
    if (currentConfigHash !== configHashRef.current || !isInitializedRef.current) {
      configHashRef.current = currentConfigHash;
      isInitializedRef.current = true;
      
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
    }
  }, [connectionConfig, createConfigHash, setConnectionForm, fetchDefaultValues]);

  // Separate effect for auto-connect logic
  useEffect(() => {
    if (autoConnect && connectionConfig && !session.connected && !connectionLoading && isInitializedRef.current) {
      console.log('[@component:CompactAndroidTVRemote] Auto-connecting...');
      handleTakeControl();
    }
  }, [autoConnect, connectionConfig, session.connected, connectionLoading, handleTakeControl]);

  const handleDisconnect = useCallback(async () => {
    try {
      await handleReleaseControl();
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    } catch (error) {
      console.error('[@component:CompactAndroidTVRemote] Error during disconnect:', error);
    }
  }, [handleReleaseControl, onDisconnectComplete]);

  // For compact view, show loading or remote directly
  if (!session.connected) {
    // If auto-connecting or has config, show minimal loading state
    if (autoConnect && connectionConfig) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          ...sx 
        }}>
          {connectionLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="info.main">
                Connecting...
              </Typography>
            </Box>
          ) : connectionError ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="error" gutterBottom>
                Connection Failed
              </Typography>
              <Button
                variant="outlined"
                onClick={handleTakeControl}
                disabled={connectionLoading}
                size="small"
              >
                Retry
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">
              Initializing...
            </Typography>
          )}
        </Box>
      );
    }
    
    // Manual connection display (when no auto-connect)
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

  // Connected state - Use AndroidTVRemoteCore with compact style
  return (
    <AndroidTVRemoteCore
      isConnected={session.connected}
      remoteConfig={remoteConfig}
      connectionLoading={connectionLoading}
      onCommand={handleRemoteCommand}
      onDisconnect={handleDisconnect}
      style="compact"
      sx={sx}
    />
  );
} 