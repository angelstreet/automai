import React, { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  PowerSettingsNew,
  PowerOff,
  RestartAlt,
  Link,
  LinkOff,
  FiberManualRecord,
  ExpandMore,
  ExpandLess,
  Usb,
} from '@mui/icons-material';
import { useRegistration } from '../../contexts/RegistrationContext';

interface USBPowerPanelProps {
  /** Custom styling */
  sx?: any;
}

interface USBConnectionForm {
  usb_hub: string;
}

interface PowerStatus {
  power_state: 'on' | 'off' | 'unknown';
  connected: boolean;
  error?: string;
}

export function USBPowerPanel({ sx = {} }: USBPowerPanelProps) {
  // Use registration context for centralized URL management
  const { buildServerUrl } = useRegistration();

  // Connection form state
  const [connectionForm, setConnectionForm] = useState<USBConnectionForm>({
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
        const response = await fetch(buildServerUrl('/api/virtualpytest/usb-power/defaults'));
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
  }, [buildServerUrl]);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(buildServerUrl('/api/virtualpytest/usb-power/status'));
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
    if (!isConnected) return;
    
    try {
      console.log('[@component:USBPowerPanel] Checking power status...');
      const response = await fetch(buildServerUrl('/api/virtualpytest/usb-power/power-status'));
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
      setPowerStatus(prev => ({ ...prev, error: 'Failed to check power status' }));
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
    // Validate required fields
    const requiredFields: (keyof USBConnectionForm)[] = ['usb_hub'];
    const missingFields = requiredFields.filter(field => !connectionForm[field]);
    
    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    setIsConnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('[@component:USBPowerPanel] Starting USB power connection...');

      const response = await fetch(buildServerUrl('/api/virtualpytest/usb-power/take-control'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionForm),
      });

      const result = await response.json();
      console.log('[@component:USBPowerPanel] Connection response:', result);

      if (result.success) {
        console.log('[@component:USBPowerPanel] Successfully connected to USB power controller');
        setIsConnected(true);
        setSuccessMessage(result.message);
        
        // Check initial power status
        setTimeout(checkPowerStatus, 1000);
      } else {
        const errorMsg = result.error || 'Failed to connect to USB power controller';
        console.error('[@component:USBPowerPanel] Connection failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Connection failed - network or server error';
      console.error('[@component:USBPowerPanel] Exception during connection:', err);
      setError(errorMsg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('[@component:USBPowerPanel] Disconnecting USB power controller...');
      const response = await fetch(buildServerUrl('/api/virtualpytest/usb-power/release-control'), {
        method: 'POST',
      });
      
      console.log('[@component:USBPowerPanel] Disconnection successful');
    } catch (err: any) {
      console.error('[@component:USBPowerPanel] Disconnect error:', err);
    } finally {
      // Always reset state
      setIsConnected(false);
      setPowerStatus({
        power_state: 'unknown',
        connected: false
      });
      setSuccessMessage(null);
      console.log('[@component:USBPowerPanel] Session state reset');
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
      console.log('[@component:USBPowerPanel] Toggling power...');
      const response = await fetch(buildServerUrl('/api/virtualpytest/usb-power/toggle'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usb_hub: connectionForm.usb_hub
        }),
      });

      const result = await response.json();
      console.log('[@component:USBPowerPanel] Toggle response:', result);

      if (result.success) {
        console.log('[@component:USBPowerPanel] Power toggle successful');
        // Update power status
        setPowerStatus(prev => ({
          ...prev,
          power_state: result.new_state || (prev.power_state === 'on' ? 'off' : 'on')
        }));
        
        // Refresh status after a delay
        setTimeout(checkPowerStatus, 2000);
      } else {
        const errorMsg = result.error || 'Failed to toggle power';
        console.error('[@component:USBPowerPanel] Power toggle failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Power toggle failed - network or server error';
      console.error('[@component:USBPowerPanel] Exception during power toggle:', err);
      setError(errorMsg);
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
      console.log('[@component:USBPowerPanel] Rebooting device...');
      const response = await fetch(buildServerUrl('/api/virtualpytest/usb-power/reboot'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usb_hub: connectionForm.usb_hub
        }),
      });

      const result = await response.json();
      console.log('[@component:USBPowerPanel] Reboot response:', result);

      if (result.success) {
        console.log('[@component:USBPowerPanel] Device reboot initiated');
        // Set power state to unknown during reboot
        setPowerStatus(prev => ({
          ...prev,
          power_state: 'unknown'
        }));
        
        // Check status after reboot delay
        setTimeout(checkPowerStatus, 10000); // 10 seconds for reboot
      } else {
        const errorMsg = result.error || 'Failed to reboot device';
        console.error('[@component:USBPowerPanel] Device reboot failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Device reboot failed - network or server error';
      console.error('[@component:USBPowerPanel] Exception during device reboot:', err);
      setError(errorMsg);
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