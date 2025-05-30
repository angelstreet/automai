import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useBluetoothRemoteConnection } from '../../pages/controller/hooks/useBluetoothRemoteConnection';
import { RemoteInterface } from '../../pages/controller/components/RemoteInterface';

interface BluetoothRemotePanelProps {
  /** Optional pre-configured connection parameters */
  connectionConfig?: {
    device_address: string;
    device_name?: string;
    pairing_pin?: string;
  };
  /** Whether to auto-connect on mount if config is provided */
  autoConnect?: boolean;
  /** Compact mode for smaller spaces like NavigationEditor */
  compact?: boolean;
  /** Custom styling */
  sx?: any;
}

export function BluetoothRemotePanel({
  connectionConfig,
  autoConnect = false,
  compact = false,
  sx = {}
}: BluetoothRemotePanelProps) {
  // UI state
  const [showOverlays, setShowOverlays] = useState(false);
  const [remoteScale, setRemoteScale] = useState(1.2);

  // Use the Bluetooth Remote connection hook
  const {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    remoteConfig,
    handleConnect,
    handleDisconnect,
    handleCommand,
  } = useBluetoothRemoteConnection();

  // Initialize connection form with provided config
  useEffect(() => {
    if (connectionConfig) {
      setConnectionForm({
        device_address: connectionConfig.device_address,
        device_name: connectionConfig.device_name || '',
        pairing_pin: connectionConfig.pairing_pin || '0000',
      });
    }
  }, [connectionConfig, setConnectionForm]);

  // Auto-connect if config is provided and autoConnect is true
  useEffect(() => {
    if (connectionConfig && autoConnect && !session.connected && !connectionLoading) {
      console.log('[@component:BluetoothRemotePanel] Auto-connecting with provided config');
      handleConnect();
    }
  }, [connectionConfig, autoConnect, session.connected, connectionLoading, handleConnect]);

  // Initialize scale from config when it loads
  useEffect(() => {
    if (remoteConfig) {
      setRemoteScale(remoteConfig.remote_info.default_scale);
    }
  }, [remoteConfig]);

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
          Bluetooth Remote Not Connected
        </Typography>
        {connectionConfig ? (
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={connectionLoading}
            size={compact ? "small" : "medium"}
          >
            {connectionLoading ? <CircularProgress size={16} /> : 'Pair & Connect'}
          </Button>
        ) : (
          <Typography variant="caption" color="textSecondary" textAlign="center">
            Configure Bluetooth device parameters to enable remote control
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
      {/* Remote Control Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant={compact ? "subtitle2" : "h6"} gutterBottom>
          Bluetooth Remote Control
        </Typography>

        {/* Controls for overlay and scale (only show in non-compact mode) */}
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
                onClick={() => setRemoteScale(prev => Math.max(remoteConfig?.remote_info.min_scale || 0.5, prev - 0.1))}
                disabled={remoteScale <= (remoteConfig?.remote_info.min_scale || 0.5)}
                sx={{ minWidth: 16, width: 16, height: 16, p: 0, fontSize: '0.6rem' }}
              >
                -
              </Button>
              <Typography variant="caption" sx={{ minWidth: 24, textAlign: 'center', fontSize: '0.6rem' }}>
                {Math.round(remoteScale * 100)}%
              </Typography>
              <Button
                size="small"
                onClick={() => setRemoteScale(prev => Math.min(remoteConfig?.remote_info.max_scale || 2.0, prev + 0.1))}
                disabled={remoteScale >= (remoteConfig?.remote_info.max_scale || 2.0)}
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
            remoteConfig={remoteConfig}
            scale={remoteScale}
            showOverlays={showOverlays}
            onCommand={handleCommand}
            fallbackImageUrl="/suncherry_remote.png"
            fallbackName="Sunrise Remote"
          />
        </Box>
      </Box>

      {/* Disconnect button */}
      <Button 
        variant="contained" 
        color="error"
        onClick={handleDisconnect}
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