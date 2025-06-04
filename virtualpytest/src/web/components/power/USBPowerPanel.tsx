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
  Chip,
} from '@mui/material';
import {
  PowerSettingsNew,
  PowerOff,
  RestartAlt,
  Link,
  LinkOff,
  FiberManualRecord,
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

interface PowerStatus {
  power_state: 'on' | 'off' | 'unknown';
  connected: boolean;
  error?: string;
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
  
  // Power status state
  const [powerStatus, setPowerStatus] = useState<PowerStatus>({
    power_state: 'unknown',
    connected: false
  });

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
        // Immediately check power status for existing connection
        await checkPowerStatus();
      }
    } catch (error) {
      console.log('[@component:USBPowerPanel] Could not check connection status:', error);
    }
  };

  const checkPowerStatus = async () => {
    try {
      console.log('[@component:USBPowerPanel] Checking power status...');
      const response = await fetch('http://localhost:5009/api/virtualpytest/usb-power/power-status');
      const result = await response.json();
      
      if (result.success && result.power_status) {
        setPowerStatus({
          power_state: result.power_status.power_state,
          connected: result.power_status.connected,
          error: result.power_status.error
        });
        console.log('[@component:USBPowerPanel] Power status updated:', result.power_status.power_state);
      } else {
        console.log('[@component:USBPowerPanel] Could not get power status:', result.error);
      }
    } catch (error) {
      console.log('[@component:USBPowerPanel] Could not check power status:', error);
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
        
        // Immediately check power status after successful connection
        console.log('[@component:USBPowerPanel] Getting initial power status...');
        await checkPowerStatus();
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
        setPowerStatus({ power_state: 'unknown', connected: false });
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

  const handleTogglePower = async () => {
    if (!isConnected) {
      setError('Please connect first before toggling power');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/usb-power/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(result.message);
        console.log('[@component:USBPowerPanel] Toggle successful:', result.message);
        // Update power status immediately
        setPowerStatus(prev => ({
          ...prev,
          power_state: result.new_state
        }));
      } else {
        setError(result.error || 'Toggle failed');
        console.error('[@component:USBPowerPanel] Toggle failed:', result.error);
      }
    } catch (err: any) {
      setError(`Toggle request failed: ${err.message}`);
      console.error('[@component:USBPowerPanel] Toggle error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReboot = async () => {
    if (!isConnected) {
      setError('Please connect first before rebooting');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/usb-power/reboot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(result.message);
        console.log('[@component:USBPowerPanel] Reboot successful:', result.message);
        // After reboot, power should be on
        setPowerStatus(prev => ({
          ...prev,
          power_state: 'on'
        }));
      } else {
        setError(result.error || 'Reboot failed');
        console.error('[@component:USBPowerPanel] Reboot failed:', result.error);
      }
    } catch (err: any) {
      setError(`Reboot request failed: ${err.message}`);
      console.error('[@component:USBPowerPanel] Reboot error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPowerLEDColor = (state: string) => {
    switch (state) {
      case 'on': return '#4caf50'; // Green
      case 'off': return '#f44336'; // Red
      default: return '#9e9e9e'; // Gray
    }
  };

  const getToggleButtonText = () => {
    if (powerStatus.power_state === 'on') return 'Power Off';
    if (powerStatus.power_state === 'off') return 'Power On';
    return 'Power On'; // Default for unknown state
  };

  const getToggleButtonIcon = () => {
    if (powerStatus.power_state === 'on') return <PowerOff />;
    return <PowerSettingsNew />;
  };

  const getToggleButtonColor = () => {
    if (powerStatus.power_state === 'on') return 'error';
    return 'success';
  };

  return (
    <Box sx={{ pl: 2, pr: 2, ...sx }}>
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

      {/* Power Control - Simple 2 buttons with LED */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Power Control
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* LED Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FiberManualRecord 
                sx={{ 
                  color: getPowerLEDColor(powerStatus.power_state),
                  fontSize: 16 
                }} 
              />
              <Typography variant="body2" color="text.secondary">
                {powerStatus.power_state.toUpperCase()}
              </Typography>
            </Box>
            
            {/* Control Buttons */}
            <Button
              variant="contained"
              color={getToggleButtonColor() as any}
              startIcon={isLoading ? <CircularProgress size={16} /> : getToggleButtonIcon()}
              onClick={handleTogglePower}
              disabled={!isConnected || isLoading}
              sx={{ minWidth: '130px' }}
            >
              {getToggleButtonText()}
            </Button>

            <Button
              variant="contained"
              color="primary"
              startIcon={isLoading ? <CircularProgress size={16} /> : <RestartAlt />}
              onClick={handleReboot}
              disabled={!isConnected || isLoading}
              sx={{ minWidth: '130px' }}
            >
              Reboot
            </Button>
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