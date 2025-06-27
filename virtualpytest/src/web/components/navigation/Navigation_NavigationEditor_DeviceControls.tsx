import { Tv as TvIcon, Lock as LockIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  ListSubheader,
} from '@mui/material';
import React from 'react';

import { NavigationEditorDeviceControlsProps } from '../../types/pages/NavigationHeader_Types';

export const NavigationEditorDeviceControls: React.FC<NavigationEditorDeviceControlsProps> = ({
  selectedHost,
  selectedDeviceId,
  isControlActive,
  isControlLoading,
  availableHosts,
  isDeviceLocked,
  onDeviceSelect,
  onTakeControl,
}) => {
  // Helper function to create a unique device identifier
  const createDeviceKey = (hostName: string, deviceId: string) => `${hostName}:${deviceId}`;

  // Helper function to parse device key back to components
  const parseDeviceKey = (key: string) => {
    const [hostName, deviceId] = key.split(':');
    return { hostName, deviceId };
  };

  // Get the current selected device key for the dropdown
  const selectedDeviceKey =
    selectedHost && selectedDeviceId
      ? createDeviceKey(selectedHost.host_name, selectedDeviceId)
      : '';

  // Check if the selected device is locked (device-based locking)
  const isSelectedDeviceLocked =
    selectedHost && selectedDeviceId
      ? isDeviceLocked(`${selectedHost.host_name}:${selectedDeviceId}`)
      : false;

  // Handle device selection change
  const handleDeviceChange = (deviceKey: string) => {
    if (!deviceKey) {
      onDeviceSelect(null, null);
      return;
    }

    const { hostName, deviceId } = parseDeviceKey(deviceKey);
    const host = availableHosts.find((h) => h.host_name === hostName);

    if (host) {
      // Verify device exists in host
      const device = host.devices?.find((d) => d.device_id === deviceId);
      if (device) {
        console.log(
          `[@component:DeviceControls] Selected device: ${device.device_name} on host ${host.host_name}`,
        );
        onDeviceSelect(host, deviceId);
      } else {
        console.error('[@component:DeviceControls] Device not found in host:', {
          hostName,
          deviceId,
          availableDevices: host.devices?.map((d) => d.device_id) || [],
        });
        onDeviceSelect(null, null);
      }
    } else {
      console.error('[@component:DeviceControls] Host not found:', { hostName });
      onDeviceSelect(null, null);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1,
        minWidth: 0,
      }}
    >
      {/* Device Selection Dropdown */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="device-select-label">Device</InputLabel>
        <Select
          labelId="device-select-label"
          value={selectedDeviceKey}
          onChange={(e) => handleDeviceChange(e.target.value)}
          label="Device"
          disabled={isControlLoading}
          sx={{ height: 32, fontSize: '0.75rem' }}
        >
          {availableHosts.map((host) => {
            const devices = host.devices || [];

            // Skip hosts with no devices - no fallbacks allowed
            if (devices.length === 0) {
              return null;
            }

            // If host has multiple devices, group them under the host name
            if (devices.length > 1) {
              return [
                <ListSubheader key={`header-${host.host_name}`} sx={{ fontSize: '0.75rem' }}>
                  {host.host_name}
                </ListSubheader>,
                ...devices.map((device) => {
                  const deviceKey = createDeviceKey(host.host_name, device.device_id);
                  const deviceIsLocked = isDeviceLocked(deviceKey);

                  return (
                    <MenuItem
                      key={deviceKey}
                      value={deviceKey}
                      disabled={deviceIsLocked}
                      sx={{
                        pl: 3, // Indent under host name
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        opacity: deviceIsLocked ? 0.6 : 1,
                      }}
                    >
                      {deviceIsLocked && (
                        <LockIcon sx={{ fontSize: '0.8rem', color: 'warning.main' }} />
                      )}
                      <span>
                        {device.device_name} ({host.host_name})
                      </span>
                      {deviceIsLocked && (
                        <Typography
                          variant="caption"
                          sx={{
                            ml: 'auto',
                            color: 'warning.main',
                            fontSize: '0.65rem',
                          }}
                        >
                          (Locked)
                        </Typography>
                      )}
                    </MenuItem>
                  );
                }),
              ];
            }

            return devices.map((device) => {
              const deviceKey = createDeviceKey(host.host_name, device.device_id);
              const deviceIsLocked = isDeviceLocked(deviceKey);

              return (
                <MenuItem
                  key={deviceKey}
                  value={deviceKey}
                  disabled={deviceIsLocked}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    opacity: deviceIsLocked ? 0.6 : 1,
                  }}
                >
                  {deviceIsLocked && (
                    <LockIcon sx={{ fontSize: '0.8rem', color: 'warning.main' }} />
                  )}
                  <span>
                    {device.device_name} ({host.host_name})
                  </span>
                  {deviceIsLocked && (
                    <Typography
                      variant="caption"
                      sx={{
                        ml: 'auto',
                        color: 'warning.main',
                        fontSize: '0.65rem',
                      }}
                    >
                      (Locked)
                    </Typography>
                  )}
                </MenuItem>
              );
            });
          })}
        </Select>
      </FormControl>

      {/* Combined Take Control & Remote Panel Button */}
      <Button
        variant={isControlActive ? 'contained' : 'outlined'}
        size="small"
        onClick={onTakeControl}
        disabled={!selectedHost || !selectedDeviceId || isControlLoading || isSelectedDeviceLocked}
        startIcon={isControlLoading ? <CircularProgress size={16} /> : <TvIcon />}
        color={isControlActive ? 'success' : 'primary'}
        sx={{
          height: 32,
          fontSize: '0.7rem',
          minWidth: 110,
          maxWidth: 110,
          whiteSpace: 'nowrap',
          px: 1.5,
        }}
        title={
          isControlLoading
            ? 'Processing...'
            : isSelectedDeviceLocked
              ? `Device is locked by another user`
              : isControlActive
                ? 'Release Control'
                : 'Take Control'
        }
      >
        {isControlLoading ? 'Processing...' : isControlActive ? 'Release' : 'Control'}
      </Button>
    </Box>
  );
};

export default NavigationEditorDeviceControls;
