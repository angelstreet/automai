import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Grid,
  Paper,
  Alert,
} from '@mui/material';
import { useRegistration } from '../../contexts/RegistrationContext';

interface RemotePanelProps {
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

  const { selectedHost } = useRegistration();

  // Check if remote controller is available
  const isRemoteAvailable = selectedHost?.controllerProxies?.remote ? true : false;

  // Auto-connect on mount if requested
  useEffect(() => {
    if (autoConnect && isRemoteAvailable && !isConnected) {
      handleConnect();
    }
  }, [autoConnect, isRemoteAvailable, isConnected]);

  // Handle connection
  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      console.log('[@component:RemotePanel] Starting remote connection...');
      
      if (!selectedHost) {
        throw new Error('No host selected for remote connection');
      }

      if (!selectedHost.controllerProxies?.remote) {
        throw new Error('Remote controller proxy not available for selected host');
      }
      
      // ✅ Remote controller proxy is available
      console.log('[@component:RemotePanel] Remote controller proxy available');
      
      setIsConnected(true);
      console.log('[@component:RemotePanel] Remote control activated');
    } catch (error: any) {
      console.error('[@component:RemotePanel] Connection failed:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      console.log('[@component:RemotePanel] Disconnecting remote control');
      setIsConnected(false);
      setScreenshotError(null);
      
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    } catch (error) {
      console.error('[@component:RemotePanel] Error during disconnect:', error);
    }
  };

  // Handle screenshot
  const handleScreenshotClick = async () => {
    if (!showScreenshot || !selectedHost?.controllerProxies?.remote) return;
    
    setIsScreenshotLoading(true);
    setScreenshotError(null);
    
    try {
      console.log('[@component:RemotePanel] Taking screenshot via remote controller');
      
      // ✅ Use remote controller proxy for screenshot
      const result = await selectedHost.controllerProxies.remote.take_screenshot();
      
      console.log('[@component:RemotePanel] Screenshot taken successfully');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to take screenshot';
      setScreenshotError(errorMessage);
      console.error('[@component:RemotePanel] Screenshot failed:', error);
    } finally {
      setIsScreenshotLoading(false);
    }
  };

  // Not available state
  if (!isRemoteAvailable) {
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
        <Typography variant="h6" color="textSecondary" gutterBottom>
          Remote Controller Not Available
        </Typography>
        <Typography variant="body2" color="textSecondary" textAlign="center">
          Select a host with remote controller proxy to use remote control
        </Typography>
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
            Remote Control
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Connect to start using remote control features
          </Typography>
          
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={isConnecting}
            fullWidth
          >
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
                  bgcolor: '#f5f5f5',
                  aspectRatio: '16/9',
                }}
              >
                <Typography variant="body2" color="textSecondary" textAlign="center">
                  Remote Control Active
                  <br />
                  Use controller proxy methods for remote operations
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
              Remote Control
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Remote controller proxy is active and ready for use
            </Typography>
            
            <Button
              variant="outlined"
              onClick={handleDisconnect}
              fullWidth
              size="small"
            >
              Disconnect
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 