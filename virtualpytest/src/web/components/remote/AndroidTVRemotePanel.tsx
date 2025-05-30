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
  TextField,
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
  /** Compact mode for smaller spaces like NavigationEditor */
  compact?: boolean;
  /** Show/hide screenshot display */
  showScreenshot?: boolean;
  /** Custom styling */
  sx?: any;
}

export function AndroidTVRemotePanel({
  connectionConfig,
  compact = false,
  showScreenshot = true,
  sx = {}
}: AndroidTVRemotePanelProps) {
  // UI state
  const [showOverlays, setShowOverlays] = useState(true);
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

  // Initialize connection form with provided config or fetch defaults
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

  // Use default scale from remoteConfig
  const defaultScale = remoteConfig?.remote_info?.default_scale || (compact ? 0.6 : 1.0);

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

  // Handle form field changes
  const handleFormChange = (field: string, value: string) => {
    setConnectionForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Box sx={{ 
      p: compact ? 1 : 2, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'auto',
      ...sx 
    }}>
      {/* Header */}

      {connectionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {connectionError}
        </Alert>
      )}

      {!session.connected ? (
        // Connection Configuration Form
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Connection Settings
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Host IP"
                value={connectionForm.host_ip}
                onChange={(e) => handleFormChange('host_ip', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Host Port"
                value={connectionForm.host_port}
                onChange={(e) => handleFormChange('host_port', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={connectionForm.host_username}
                onChange={(e) => handleFormChange('host_username', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={connectionForm.host_password}
                onChange={(e) => handleFormChange('host_password', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Device IP"
                value={connectionForm.device_ip}
                onChange={(e) => handleFormChange('device_ip', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Device Port"
                value={connectionForm.device_port}
                onChange={(e) => handleFormChange('device_port', e.target.value)}
                size="small"
              />
            </Grid>
          </Grid>
          
          <Button
            variant="contained"
            onClick={handleTakeControl}
            disabled={connectionLoading}
            fullWidth
          >
            {connectionLoading ? <CircularProgress size={16} /> : 'Connect'}
          </Button>
        </Paper>
      ) : (
        // Connected - Two Column Layout
        <Grid container spacing={3} sx={{ flex: 1 }}>
          {/* Left Column - Screenshot */}
          {showScreenshot && (
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Device Screenshot
                </Typography>
                
                {screenshotError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {screenshotError}
                  </Alert>
                )}
                
                <Paper 
                  elevation={2} 
                  sx={{ 
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 300,
                    bgcolor: 'grey.100',
                    overflow: 'hidden',
                    mb: 2
                  }}
                >
                  {androidScreenshot ? (
                    <img 
                      src={`data:image/png;base64,${androidScreenshot}`} 
                      alt="Android TV Screenshot"
                      style={{ 
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="textSecondary" textAlign="center">
                      No screenshot available
                      <br />
                      Click "Take Screenshot" to capture the current screen
                    </Typography>
                  )}
                </Paper>
                
                <Button
                  variant="contained"
                  onClick={handleScreenshotClick}
                  disabled={isScreenshotLoading}
                  fullWidth
                >
                  {isScreenshotLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="body2">Taking Screenshot...</Typography>
                    </Box>
                  ) : (
                    'Take Screenshot'
                  )}
                </Button>
              </Box>
            </Grid>
          )}
          
          {/* Right Column - Remote Control */}
          <Grid item xs={12} md={showScreenshot ? 6 : 12}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6">
                  Remote Control
                </Typography>
                <Button
                  variant={showOverlays ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setShowOverlays(!showOverlays)}
                >
                  {showOverlays ? 'Hide' : 'Show'} Overlays
                </Button>
              </Box>

              {/* Remote Interface */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                overflow: 'hidden',
                alignItems: 'flex-start',
                flex: 1,
                mb: 2
              }}>
                <RemoteInterface
                  remoteConfig={remoteConfig || null}
                  scale={defaultScale}
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
                onClick={handleReleaseControl}
                disabled={connectionLoading}
                fullWidth
              >
                {connectionLoading ? <CircularProgress size={16} /> : 'Disconnect'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
} 