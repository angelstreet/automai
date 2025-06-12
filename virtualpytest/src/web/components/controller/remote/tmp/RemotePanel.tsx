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
import { useRemoteConnection } from '../../hooks/remote/useRemoteConnection';
import { RemoteCore } from './RemoteCore';
import { RemoteType, BaseConnectionConfig } from '../../types/remote/remoteTypes';
import { ConnectionForm } from '../../types/remote/types';

interface RemotePanelProps {
  /** The type of remote device */
  remoteType: RemoteType;
  /** Optional pre-configured connection parameters */
  connectionConfig?: BaseConnectionConfig;
  /** Show/hide screenshot display */
  showScreenshot?: boolean;
  /** Custom styling */
  sx?: any;
}

export function RemotePanel({
  remoteType,
  connectionConfig,
  showScreenshot = true,
  sx = {}
}: RemotePanelProps) {
  // Screenshot UI state
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  // Use the generic remote connection hook - single source of truth
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
    deviceConfig,
  } = useRemoteConnection(remoteType);

  // Reset screenshot loading state on mount
  useEffect(() => {
    setIsScreenshotLoading(false);
  }, []);

  // Initialize connection form with provided config or fetch defaults
  useEffect(() => {
    if (connectionConfig) {
      console.log(`[@component:RemotePanel] Initializing with provided config for ${remoteType}`);
      setConnectionForm({
        host_ip: connectionConfig.host_ip,
        host_port: connectionConfig.host_port || '22',
        host_username: connectionConfig.host_username,
        host_password: connectionConfig.host_password,
        device_ip: connectionConfig.device_ip,
        device_port: connectionConfig.device_port || '5555',
      });
    } else {
      console.log(`[@component:RemotePanel] No config provided for ${remoteType}, fetching defaults`);
      fetchDefaultValues();
    }
  }, [connectionConfig, fetchDefaultValues, setConnectionForm, remoteType]);

  const handleScreenshotClick = async () => {
    if (!deviceConfig?.hasScreenshot) return;
    
    setIsScreenshotLoading(true);
    setScreenshotError(null);
    try {
      console.log(`[@component:RemotePanel] Taking screenshot for ${remoteType}`);
      await handleScreenshot();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to take screenshot';
      setScreenshotError(errorMessage);
      console.error(`[@component:RemotePanel] Screenshot failed for ${remoteType}:`, error);
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
      // Clear screenshot error when disconnecting
      setScreenshotError(null);
      await handleReleaseControl();
    } catch (error) {
      console.error(`[@component:RemotePanel] Error during disconnect for ${remoteType}:`, error);
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
            {deviceConfig?.connectionFields.map((field) => (
              <Grid item xs={12} sm={6} key={field.name}>
                <TextField
                  fullWidth
                  label={field.label}
                  type={field.type || 'text'}
                  value={connectionForm[field.name as keyof ConnectionForm] || ''}
                  onChange={(e) => handleFormChange(field.name, e.target.value)}
                  size="small"
                />
              </Grid>
            ))}
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
        {deviceConfig?.hasScreenshot && showScreenshot && (
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
                  aspectRatio: '16/9',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
              >
                {androidScreenshot ? (
                  <img 
                    src={`data:image/png;base64,${androidScreenshot}`} 
                    alt={`${deviceConfig.name} Screenshot`}
                    style={{ 
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      pointerEvents: 'none'
                    }}
                    draggable={false}
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
        )}
        
        {/* Remote Section */}
        <Grid item xs={12} md={deviceConfig?.hasScreenshot && showScreenshot ? 4 : 12}>
          <RemoteCore
            remoteType={remoteType}
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