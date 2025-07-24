import {
  PowerSettingsNew,
  PowerOff,
  RestartAlt,
  Link,
  LinkOff,
  FiberManualRecord,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { useHostManager } from '../../../hooks/useHostManager';

interface PowerPanelProps {
  hostName: string;
  /** Custom styling */
  sx?: any;
}

interface PowerStatus {
  power_state: 'on' | 'off' | 'unknown';
  connected: boolean;
  error?: string;
}

export const TapoPowerPanel: React.FC<PowerPanelProps> = ({ hostName, sx = {} }) => {
  const {} = useHostManager();

  // UI state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Power status state
  const [powerStatus, setPowerStatus] = useState<PowerStatus>({
    power_state: 'unknown',
    connected: false,
  });

  // Check connection status on mount
  useEffect(() => {
    // Check if already connected
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/server/power/status');
      const result = await response.json();

      if (result.success && result.connected) {
        setIsConnected(true);
        console.log('[@component:TapoPowerPanel] Found existing power connection');
        // Immediately check power status for existing connection
        await checkPowerStatus();
      }
    } catch (error) {
      console.log('[@component:TapoPowerPanel] Could not check connection status:', error);
    }
  };

  const checkPowerStatus = async () => {
    if (!isConnected) return;

    try {
      console.log('[@component:TapoPowerPanel] Checking power status...');
      const response = await fetch('/server/power/power-status');
      const result = await response.json();

      if (result.success && result.power_status) {
        setPowerStatus({
          power_state: result.power_status.power_state,
          connected: result.power_status.connected,
          error: result.power_status.error,
        });
        console.log(
          '[@component:TapoPowerPanel] Power status updated:',
          result.power_status.power_state,
        );
      } else {
        console.log('[@component:TapoPowerPanel] Could not get power status:', result.error);
      }
    } catch (error) {
      console.log('[@component:TapoPowerPanel] Could not check power status:', error);
      setPowerStatus((prev) => ({ ...prev, error: 'Failed to check power status' }));
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('[@component:TapoPowerPanel] Starting power connection...');

      const response = await fetch('/server/power/takeControl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('[@component:TapoPowerPanel] Connection response:', result);

      if (result.success) {
        console.log('[@component:TapoPowerPanel] Successfully connected to power controller');
        setIsConnected(true);
        setSuccessMessage(result.message);

        // Check initial power status
        setTimeout(checkPowerStatus, 1000);
      } else {
        const errorMsg = result.error || 'Failed to connect to power controller';
        console.error('[@component:TapoPowerPanel] Connection failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Connection failed - network or server error';
      console.error('[@component:TapoPowerPanel] Exception during connection:', err);
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
      console.log('[@component:TapoPowerPanel] Disconnecting power controller...');
      await fetch('/server/power/releaseControl', {
        method: 'POST',
      });

      console.log('[@component:TapoPowerPanel] Disconnection successful');
    } catch (err: any) {
      console.error('[@component:TapoPowerPanel] Disconnect error:', err);
    } finally {
      // Always reset state
      setIsConnected(false);
      setPowerStatus({
        power_state: 'unknown',
        connected: false,
      });
      setSuccessMessage(null);
      console.log('[@component:TapoPowerPanel] Session state reset');
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
      console.log('[@component:TapoPowerPanel] Toggling power...');
      const response = await fetch('/server/power/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('[@component:TapoPowerPanel] Toggle response:', result);

      if (result.success) {
        console.log('[@component:TapoPowerPanel] Power toggle successful');
        // Update power status
        setPowerStatus((prev) => ({
          ...prev,
          power_state: result.new_state || (prev.power_state === 'on' ? 'off' : 'on'),
        }));

        // Refresh status after a delay
        setTimeout(checkPowerStatus, 2000);
      } else {
        const errorMsg = result.error || 'Failed to toggle power';
        console.error('[@component:TapoPowerPanel] Power toggle failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Power toggle failed - network or server error';
      console.error('[@component:TapoPowerPanel] Exception during power toggle:', err);
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
      console.log('[@component:TapoPowerPanel] Rebooting device...');
      const response = await fetch('/server/power/reboot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('[@component:TapoPowerPanel] Reboot response:', result);

      if (result.success) {
        console.log('[@component:TapoPowerPanel] Device reboot initiated');
        // Set power state to unknown during reboot
        setPowerStatus((prev) => ({
          ...prev,
          power_state: 'unknown',
        }));

        // Check status after reboot delay
        setTimeout(checkPowerStatus, 10000); // 10 seconds for reboot
      } else {
        const errorMsg = result.error || 'Failed to reboot device';
        console.error('[@component:TapoPowerPanel] Device reboot failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Device reboot failed - network or server error';
      console.error('[@component:TapoPowerPanel] Exception during device reboot:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const getPowerLEDColor = (state: string) => {
    switch (state) {
      case 'on':
        return '#4caf50'; // Green
      case 'off':
        return '#f44336'; // Red
      default:
        return '#9e9e9e'; // Gray
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

      {/* Connection Controls - Simplified */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Power Controller Connection
          </Typography>

          <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
            {!isConnected ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={isConnecting ? <CircularProgress size={16} /> : <Link />}
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect to Power Controller'}
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
                  fontSize: 16,
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
};
