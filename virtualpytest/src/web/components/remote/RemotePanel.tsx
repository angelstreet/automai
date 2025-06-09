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
import { useRegistration } from '../../contexts/RegistrationContext';

interface RemotePanelProps {
  /** The type of remote device */
  remoteType: RemoteType;
  /** Optional pre-configured connection parameters */
  connectionConfig?: BaseConnectionConfig;
  /** Show/hide screenshot display */
  showScreenshot?: boolean;
  /** Custom styling */
  sx?: any;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Callback when disconnect is complete */
  onDisconnectComplete?: () => void;
}

export function RemotePanel({
  remoteType,
  connectionConfig,
  showScreenshot = true,
  autoConnect = false,
  onDisconnectComplete,
  sx = {}
}: RemotePanelProps) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Screenshot UI state
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  // Connection form state
  const [connectionForm, setConnectionForm] = useState({
    device_ip: connectionConfig?.device_ip || '',
    device_port: connectionConfig?.device_port || '5555',
    device_path: (connectionConfig as any)?.device_path || '',
    protocol: (connectionConfig as any)?.protocol || '',
    frequency: (connectionConfig as any)?.frequency || '',
    device_address: (connectionConfig as any)?.device_address || '',
    device_name: (connectionConfig as any)?.device_name || '',
    pairing_pin: (connectionConfig as any)?.pairing_pin || '',
  });

  const { buildServerUrl } = useRegistration();

  // Use the simplified remote connection hook
  const {
    isLoading,
    error,
    showRemote,
    hideRemote,
    sendCommand,
  } = useRemoteConnection(remoteType);

  // Auto-connect on mount if requested
  useEffect(() => {
    if (autoConnect && connectionConfig && !isConnected) {
      handleTakeControl();
    }
  }, [autoConnect, connectionConfig, isConnected]);

  // Handle take control via centralized server URL building
  const handleTakeControl = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      console.log(`[@component:RemotePanel] Taking control for ${remoteType}`);
      
      // Build device_id based on remote type
      let deviceId = '';
      if (remoteType === 'android-tv' || remoteType === 'android-mobile') {
        deviceId = `${connectionForm.device_ip}:${connectionForm.device_port}`;
      } else {
        deviceId = connectionForm.device_path || connectionForm.device_address || 'unknown';
      }

      // Use centralized buildServerUrl for take-control endpoint
      const takeControlUrl = buildServerUrl('/server/control/take-control');
      const response = await fetch(takeControlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          session_id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        await showRemote(); // Show remote via abstract controller
        console.log(`[@component:RemotePanel] Control activated for ${remoteType}`);
      } else {
        throw new Error(data.message || 'Failed to take control');
      }
    } catch (error: any) {
      console.error(`[@component:RemotePanel] Take control failed for ${remoteType}:`, error);
      setConnectionError(error.message);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle release control
  const handleReleaseControl = async () => {
    try {
      console.log(`[@component:RemotePanel] Releasing control for ${remoteType}`);
      await hideRemote(); // Hide remote via abstract controller
      setIsConnected(false);
      setScreenshot(null);
      setScreenshotError(null);
      
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    } catch (error) {
      console.error(`[@component:RemotePanel] Error during disconnect for ${remoteType}:`, error);
    }
  };

  // Handle screenshot
  const handleScreenshotClick = async () => {
    if (!showScreenshot) return;
    
    setIsScreenshotLoading(true);
    setScreenshotError(null);
    
    try {
      console.log(`[@component:RemotePanel] Taking screenshot for ${remoteType}`);
      
      const response = await fetch(buildServerUrl('/server/capture/screenshot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_model: remoteType.replace('-', '_'),
          upload_to_cloudflare: false,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.screenshot_base64) {
        setScreenshot(data.screenshot_base64);
      } else {
        throw new Error(data.message || 'Failed to take screenshot');
      }
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

  // Get connection fields based on remote type
  const getConnectionFields = () => {
    switch (remoteType) {
      case 'android-tv':
      case 'android-mobile':
        return [
          { name: 'device_ip', label: 'Device IP', type: 'text' },
          { name: 'device_port', label: 'Device Port', type: 'text' },
        ];
      case 'ir':
        return [
          { name: 'device_path', label: 'Device Path', type: 'text' },
          { name: 'protocol', label: 'Protocol', type: 'text' },
          { name: 'frequency', label: 'Frequency', type: 'text' },
        ];
      case 'bluetooth':
        return [
          { name: 'device_address', label: 'Device Address', type: 'text' },
          { name: 'device_name', label: 'Device Name', type: 'text' },
          { name: 'pairing_pin', label: 'Pairing PIN', type: 'text' },
        ];
      default:
        return [];
    }
  };

  const connectionFields = getConnectionFields();

  // Connection status display
  if (!isConnected) {
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
            {remoteType.charAt(0).toUpperCase() + remoteType.slice(1)} Connection
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {connectionFields.map((field) => (
              <Grid item xs={12} sm={6} key={field.name}>
                <TextField
                  fullWidth
                  label={field.label}
                  type={field.type || 'text'}
                  value={connectionForm[field.name as keyof typeof connectionForm] || ''}
                  onChange={(e) => handleFormChange(field.name, e.target.value)}
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
          
          <Button
            variant="contained"
            onClick={handleTakeControl}
            disabled={isConnecting}
            fullWidth
          >
            {isConnecting ? <CircularProgress size={16} /> : 'Connect'}
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
        {showScreenshot && (
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
                {screenshot ? (
                  <img 
                    src={`data:image/png;base64,${screenshot}`} 
                    alt={`${remoteType} Screenshot`}
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
        <Grid item xs={12} md={showScreenshot ? 4 : 12}>
          <RemoteCore
            remoteType={remoteType}
            onDisconnect={handleReleaseControl}
            style="panel"
          />
        </Grid>
      </Grid>
    </Box>
  );
} 