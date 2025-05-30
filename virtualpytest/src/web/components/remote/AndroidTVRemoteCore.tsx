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
import { Android } from '@mui/icons-material';
import { useAndroidTVConnection } from '../../hooks/remote/useAndroidTVConnection';
import { RemoteInterface } from './RemoteInterface';

interface AndroidTVRemoteCoreProps {
  /** Optional pre-configured connection parameters */
  connectionConfig?: {
    host_ip: string;
    host_port?: string;
    host_username: string;
    host_password: string;
    device_ip: string;
    device_port?: string;
  };
  /** Layout configuration */
  layout: {
    /** Show connection form when not connected */
    showConnectionForm?: boolean;
    /** Show screenshot section */
    showScreenshot?: boolean;
    /** Layout direction for connected state */
    direction?: 'row' | 'column';
    /** Remote positioning style */
    remoteStyle?: 'absolute' | 'flex';
    /** Custom styling */
    sx?: any;
  };
  /** Callback when disconnect is complete */
  onDisconnectComplete?: () => void;
}

export function AndroidTVRemoteCore({
  connectionConfig,
  layout,
  onDisconnectComplete
}: AndroidTVRemoteCoreProps) {
  // UI state
  const [showOverlays, setShowOverlays] = useState(layout.remoteStyle === 'absolute' ? false : true);
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

  // Initialize connection form with provided config or fetch defaults
  useEffect(() => {
    if (connectionConfig) {
      console.log('[@component:AndroidTVRemoteCore] Initializing with provided config');
      setConnectionForm({
        host_ip: connectionConfig.host_ip,
        host_port: connectionConfig.host_port || '22',
        host_username: connectionConfig.host_username,
        host_password: connectionConfig.host_password,
        device_ip: connectionConfig.device_ip,
        device_port: connectionConfig.device_port || '5555',
      });
    } else {
      console.log('[@component:AndroidTVRemoteCore] No config provided, fetching defaults');
      fetchDefaultValues();
    }
  }, [connectionConfig, fetchDefaultValues, setConnectionForm]);

  // Use default scale from remoteConfig
  const defaultScale = remoteConfig?.remote_info?.default_scale || 1;

  const handleScreenshotClick = async () => {
    setIsScreenshotLoading(true);
    setScreenshotError(null);
    try {
      console.log('[@component:AndroidTVRemoteCore] Taking screenshot');
      await handleScreenshot();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to take screenshot';
      setScreenshotError(errorMessage);
      console.error('[@component:AndroidTVRemoteCore] Screenshot failed:', error);
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
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    } catch (error) {
      console.error('[@component:AndroidTVRemoteCore] Error during disconnect:', error);
    }
  };

  // Connection status display
  if (!session.connected) {
    if (layout.showConnectionForm) {
      // Full connection form
      return (
        <Box sx={{ p: 2, ...layout.sx }}>
         

         

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
    } else {
      // Compact connection display
      return (
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          ...layout.sx 
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
  }

  // Connected state - different layouts based on configuration
  if (layout.direction === 'row' && layout.showScreenshot) {
    // Two-column layout (AndroidTVRemotePanel style)
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', ...layout.sx }}>
        <Grid container spacing={3} sx={{ flex: 1 }}>
          {/* Screenshot Section */}
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              p: 2,
              border: '2px dashed #ccc',
              borderRadius: 2,
              bgcolor: 'grey.50'
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
                  maxHeight: 400,
                  bgcolor: androidScreenshot ? 'transparent' : 'grey.100',
                  borderRadius: 1,
                  mb: 2,
                  aspectRatio: '16/9',
                  overflow: 'hidden'
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
                    No screenshot available
                    <br />
                    Click "Take Screenshot" to capture the current screen
                  </Typography>
                )}
              </Box>
              
              <Button
                variant="contained"
                onClick={handleScreenshotClick}
                disabled={isScreenshotLoading}
                fullWidth
                size="large"
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
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
              p: 2,
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              bgcolor: 'background.paper'
            }}>
              <Box sx={{ 
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 10
              }}>
                <Button
                  variant={showOverlays ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setShowOverlays(!showOverlays)}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1, 
                    fontSize: '0.7rem',
                    opacity: 0.8,
                    '&:hover': { opacity: 1 }
                  }}
                >
                  {showOverlays ? 'Hide Overlay' : 'Show Overlay'}
                </Button>
              </Box>
              
              <Box sx={{ 
                position: 'absolute',
                top: 50,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 130 * defaultScale,
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

              <Button 
                variant="contained" 
                color="error"
                onClick={handleDisconnect}
                disabled={connectionLoading}
                size="small"
                fullWidth
                sx={{ 
                  mt: 0, 
                  height: '36px',
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  right: 8,
                  width: 'calc(100% - 16px)'
                }}
              >
                {connectionLoading ? <CircularProgress size={16} /> : 'Disconnect'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  } else {
    // Single column layout (CompactAndroidTVRemote style)
    const containerWidth = 130 * defaultScale;
    
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        ...layout.sx 
      }}>
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
        
        <Box sx={{ 
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${containerWidth}px`,
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
} 