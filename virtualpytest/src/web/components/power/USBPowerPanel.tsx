import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  PowerSettingsNew,
  PowerOff,
  RestartAlt,
  Link,
  LinkOff,
} from '@mui/icons-material';

interface USBPowerPanelProps {
  /** Custom styling */
  sx?: any;
}

interface USBConnectionForm {
  host_ip: string;
  host_port: string;
  host_username: string;
  host_password: string;
  usb_hub: string;
}

export function USBPowerPanel({ sx = {} }: USBPowerPanelProps) {
  // Connection form state
  const [connectionForm, setConnectionForm] = useState<USBConnectionForm>({
    host_ip: '',
    host_port: '22',
    host_username: '',
    host_password: '',
    usb_hub: '1',
  });

  // UI state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch default values on mount
  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const response = await fetch('http://localhost:5009/api/virtualpytest/usb-power/defaults');
        const result = await response.json();
        
        if (result.success && result.defaults) {
          setConnectionForm(prev => ({
            ...prev,
            ...result.defaults
          }));
          console.log('[@component:USBPowerPanel] Loaded default connection values');
        }
      } catch (error) {
        console.log('[@component:USBPowerPanel] Could not load default values:', error);
      }
    };

    fetchDefaults();
    
    // Check if already connected
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/usb-power/status');
      const result = await response.json();
      
      if (result.success && result.connected) {
        setIsConnected(true);
        console.log('[@component:USBPowerPanel] Found existing connection');
      }
    } catch (error) {
      console.log('[@component:USBPowerPanel] Could not check connection status:', error);
    }
  };

  const handleInputChange = (field: keyof USBConnectionForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setConnectionForm(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear messages when user starts typing
    setError(null);
    setSuccessMessage(null);
  };

  const handleConnect = async () => {
    if (!connectionForm.host_ip || !connectionForm.host_username || !connectionForm.host_password) {
      setError('Please fill in all required connection fields');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/usb-power/take-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionForm),
      });

      const result = await response.json();

      if (result.success) {
        setIsConnected(true);
        setSuccessMessage(result.message);
        console.log('[@component:USBPowerPanel] Connection successful:', result.message);
      } else {
        setError(result.error || 'Connection failed');
        console.error('[@component:USBPowerPanel] Connection failed:', result.error);
      }
    } catch (err: any) {
      setError(`Connection request failed: ${err.message}`);
      console.error('[@component:USBPowerPanel] Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/usb-power/release-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setIsConnected(false);
        setSuccessMessage(result.message);
        console.log('[@component:USBPowerPanel] Disconnection successful:', result.message);
      } else {
        setError(result.error || 'Disconnection failed');
        console.error('[@component:USBPowerPanel] Disconnection failed:', result.error);
      }
    } catch (err: any) {
      setError(`Disconnection request failed: ${err.message}`);
      console.error('[@component:USBPowerPanel] Disconnection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const executeCommand = async (command: 'power-on' | 'power-off' | 'reboot') => {
    if (!isConnected) {
      setError('Please connect first before executing commands');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`http://localhost:5009/api/virtualpytest/usb-power/${command}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(result.message);
        console.log(`[@component:USBPowerPanel] ${command} successful:`, result.message);
      } else {
        setError(result.error || `${command} failed`);
        console.error(`[@component:USBPowerPanel] ${command} failed:`, result.error);
      }
    } catch (err: any) {
      setError(`${command} request failed: ${err.message}`);
      console.error(`[@component:USBPowerPanel] ${command} error:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ pl: 2,pr: 2, ...sx }}>
      {/* Connection Status */}
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2">Status:</Typography>
        <Chip 
          label={isConnected ? 'Connected' : 'Disconnected'}
          color={isConnected ? 'success' : 'default'}
          size="small"
        />
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            SSH Connection Settings
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Host IP *"
                value={connectionForm.host_ip}
                onChange={handleInputChange('host_ip')}
                size="small"
                disabled={isConnected || isConnecting}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Host Port"
                value={connectionForm.host_port}
                onChange={handleInputChange('host_port')}
                size="small"
                disabled={isConnected || isConnecting}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username *"
                value={connectionForm.host_username}
                onChange={handleInputChange('host_username')}
                size="small"
                disabled={isConnected || isConnecting}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password *"
                type="password"
                value={connectionForm.host_password}
                onChange={handleInputChange('host_password')}
                size="small"
                disabled={isConnected || isConnecting}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="USB Hub"
                value={connectionForm.usb_hub}
                onChange={handleInputChange('usb_hub')}
                size="small"
                disabled={isConnected || isConnecting}
              />
            </Grid>
          </Grid>

          {/* Connection Controls */}
          <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
            {!isConnected ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={isConnecting ? <CircularProgress size={16} /> : <Link />}
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={isConnecting ? <CircularProgress size={16} /> : <LinkOff />}
                onClick={handleDisconnect}
                disabled={isConnecting}
              >
                {isConnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Power Control Buttons */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Power Controls
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Tooltip title="Power On USB Hub">
              <Button
                variant="contained"
                color="success"
                startIcon={isLoading ? <CircularProgress size={16} /> : <PowerSettingsNew />}
                onClick={() => executeCommand('power-on')}
                disabled={!isConnected || isLoading}
                sx={{ minWidth: '120px' }}
              >
                Power On
              </Button>
            </Tooltip>

            <Tooltip title="Power Off USB Hub">
              <Button
                variant="contained"
                color="error"
                startIcon={isLoading ? <CircularProgress size={16} /> : <PowerOff />}
                onClick={() => executeCommand('power-off')}
                disabled={!isConnected || isLoading}
                sx={{ minWidth: '120px' }}
              >
                Power Off
              </Button>
            </Tooltip>

            <Tooltip title="Reboot USB Hub (Off then On)">
              <Button
                variant="contained"
                color="primary"
                startIcon={isLoading ? <CircularProgress size={16} /> : <RestartAlt />}
                onClick={() => executeCommand('reboot')}
                disabled={!isConnected || isLoading}
                sx={{ minWidth: '120px' }}
              >
                Reboot
              </Button>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {successMessage}
        </Alert>
      )}
    </Box>
  );
} 