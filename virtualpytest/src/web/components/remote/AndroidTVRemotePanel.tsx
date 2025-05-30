import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Grid,
  Paper,
  Alert,
  TextField,
} from '@mui/material';
import { useAndroidTVConnection } from '../../hooks/remote/useAndroidTVConnection';
import { AndroidTVRemoteCore } from './AndroidTVRemoteCore';

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
  /** Show/hide screenshot display */
  showScreenshot?: boolean;
  /** Custom styling */
  sx?: any;
}

export function AndroidTVRemotePanel({
  connectionConfig,
  showScreenshot = true,
  sx = {}
}: AndroidTVRemotePanelProps) {
  // Screenshot UI state
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  // Use the Android TV connection hook - single source of truth
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

  // Reset screenshot loading state on mount
  useEffect(() => {
    setIsScreenshotLoading(false);
  }, []);

  // Initialize connection form with provided config or fetch defaults
  useEffect(() => {
    if (connectionConfig) {
      console.log('[@component:AndroidTVRemotePanel] Initializing with provided config');
      setConnectionForm({
        host_ip: connectionConfig.host_ip,
        host_port: connectionConfig.host_port || '22',
        host_username: connectionConfig.host_username,
        host_password: connectionConfig.host_password,
        device_ip: connectionConfig.device_ip,
        device_port: connectionConfig.device_port || '5555',
      });
    } else {
      console.log('[@component:AndroidTVRemotePanel] No config provided, fetching defaults');
      fetchDefaultValues();
    }
  }, [connectionConfig, fetchDefaultValues, setConnectionForm]);

  const handleScreenshotClick = async () => {
    setIsScreenshotLoading(true);
    setScreenshotError(null);
    try {
      console.log('[@component:AndroidTVRemotePanel] Taking screenshot');
      await handleScreenshot();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to take screenshot';
      setScreenshotError(errorMessage);
      console.error('[@component:AndroidTVRemotePanel] Screenshot failed:', error);
    } finally {
      setIsScreenshotLoading(false);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setConnectionForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDisconnect = async () => {
    try {
      await handleReleaseControl();
    } catch (error) {
      console.error('[@component:AndroidTVRemotePanel] Error during disconnect:', error);
    }
  };

  // Connection status display
  if (!session.connected) {
    // Full connection form
    return (
      <Box sx={{ p: 2, ...sx }}>
        {connectionError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {connectionError}
          </Alert>
        )}

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
      </Box>
    );
  }

  // Connected state - Two-column layout
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', ...sx }}>
      <Grid container spacing={3} sx={{ flex: 1 }}>
        {/* Screenshot Section */}
        <Grid item xs={12} md={8}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            position: 'relative'
          }}>
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
                bgcolor: 'transparent',
                aspectRatio: '16/9'
              }}
            >
              {androidScreenshot ? (
                <img 
                  src={`data:image/png;base64,${androidScreenshot}`} 
                  alt="Android TV Screenshot"
                  style={{ 
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <Typography variant="body2" color="textSecondary" textAlign="center">
    
                  Click "Take Screenshot" to capture the current screen
                </Typography>
              )}
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
        
        {/* Remote Section */}
        <Grid item xs={12} md={4}>
          <AndroidTVRemoteCore
            isConnected={session.connected}
            remoteConfig={remoteConfig}
            connectionLoading={connectionLoading}
            onCommand={handleRemoteCommand}
            onDisconnect={handleDisconnect}
            style="panel"
          />
        </Grid>
      </Grid>
    </Box>
  );
} 