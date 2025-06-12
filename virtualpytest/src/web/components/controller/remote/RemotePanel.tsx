import { Box, Button, Typography, CircularProgress, Grid, Paper, Alert } from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';

import { RemoteType, BaseConnectionConfig } from '../../../types/controller/Remote_Types';

interface Host {
  host_name: string;
  device_name: string;
  device_model: string;
}

interface RemotePanelProps {
  /** Host device to control */
  host: Host;
  /** The type of remote device */
  remoteType?: RemoteType;
  /** Optional pre-configured connection parameters */
  connectionConfig?: BaseConnectionConfig;
  /** Show/hide screenshot display */
  showScreenshot?: boolean;
  /** Custom styling */
  sx?: any;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Callback when connection state changes */
  onConnectionChange?: (connected: boolean) => void;
  /** Callback when disconnect is complete */
  onDisconnectComplete?: () => void;
}

export function RemotePanel({
  host,
  remoteType = 'android-mobile',
  showScreenshot = false,
  sx = {},
  autoConnect = false,
  onConnectionChange,
  onDisconnectComplete,
}: RemotePanelProps) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Screenshot UI state
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  // Handle connection
  // handleConnect removed - control is managed by navigation editor

  // Auto-connect on mount if requested (removed - control managed by navigation editor)

  // If panel is shown, control is already active (set connected state)
  useEffect(() => {
    if (host) {
      // Panel is shown after successful control acquisition by navigation editor
      console.log(`[@component:RemotePanel] Control already active for ${host.host_name}`);
      setIsConnected(true);
      if (onConnectionChange) {
        onConnectionChange(true);
      }
    }
  }, [host, onConnectionChange]);

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      console.log(`[@component:RemotePanel] Disconnecting remote control from ${host.host_name}`);
      setIsConnected(false);
      setScreenshotError(null);

      if (onConnectionChange) {
        onConnectionChange(false);
      }

      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    } catch (error) {
      console.error('[@component:RemotePanel] Error during disconnect:', error);
    }
  };

  // Handle screenshot
  const handleScreenshotClick = async () => {
    if (!showScreenshot || !host) return;

    setIsScreenshotLoading(true);
    setScreenshotError(null);

    try {
      console.log(`[@component:RemotePanel] Taking screenshot for ${host.host_name}`);

      // Use server route instead of proxy
      const response = await fetch(`/server/remote/take-screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: host.host_name,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[@component:RemotePanel] Screenshot taken successfully');
      } else {
        throw new Error(result.error || 'Screenshot failed');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to take screenshot';
      setScreenshotError(errorMessage);
      console.error('[@component:RemotePanel] Screenshot failed:', error);
    } finally {
      setIsScreenshotLoading(false);
    }
  };

  // Early return if no host provided
  if (!host) {
    return (
      <Box sx={{ ...sx, p: 2 }}>
        <Alert severity="error">No host device provided. Please select a host to control.</Alert>
      </Box>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <Box sx={{ p: 2, ...sx }}>
        {connectionError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {connectionError}
          </Alert>
        )}

        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Remote Control for {host.device_name}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Connect to start using remote control features for {remoteType} device
          </Typography>

          <Button variant="contained" onClick={() => {}} disabled={true} fullWidth>
            {isConnecting ? <CircularProgress size={16} /> : 'Connect'}
          </Button>
        </Paper>
      </Box>
    );
  }

  // Connected state
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', ...sx }}>
      <Grid container spacing={3} sx={{ flex: 1 }}>
        {/* Screenshot Section */}
        {showScreenshot && (
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                position: 'relative',
              }}
            >
              {screenshotError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {screenshotError}
                </Alert>
              )}

              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 250,
                  ml: 2,
                  p: 2,
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  bgcolor: '#f5f5f5',
                  aspectRatio: '16/9',
                }}
              >
                <Typography variant="body2" color="textSecondary" textAlign="center">
                  Remote Control Active for {host.device_name}
                  <br />({remoteType} device)
                  <br />
                  Use screenshot or disconnect when finished
                </Typography>
              </Box>

              <Button
                variant="contained"
                onClick={handleScreenshotClick}
                disabled={isScreenshotLoading}
                fullWidth
                size="small"
                sx={{
                  height: '28px',
                  mt: 2,
                  ml: 2,
                  mr: 2,
                }}
              >
                {isScreenshotLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Taking Screenshot...</Typography>
                  </Box>
                ) : (
                  'Take Screenshot'
                )}
              </Button>
            </Box>
          </Grid>
        )}

        {/* Remote Control Section */}
        <Grid item xs={12} md={showScreenshot ? 4 : 12}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Remote Control Active
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Connected to {host.device_name} ({remoteType})
              <br />
              Host: {host.host_name}
            </Typography>

            <Button variant="outlined" onClick={handleDisconnect} fullWidth size="small">
              Disconnect
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
