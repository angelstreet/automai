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
} from '@mui/material';
import React from 'react';

import { NavigationEditorDeviceControlsProps } from '../../types/pages/Navigation_Header_Types';

export const NavigationEditorDeviceControls: React.FC<NavigationEditorDeviceControlsProps> = ({
  selectedDevice,
  isControlActive,
  isControlLoading,
  isLoading,
  error,
  availableHosts,
  isDeviceLocked,
  onDeviceSelect,
  onTakeControl,
}) => {
  // Find the selected device data
  const selectedDeviceHost = availableHosts.find((device) => device.host_name === selectedDevice);

  const isSelectedDeviceLocked = selectedDevice ? isDeviceLocked(selectedDevice) : false;

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
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="device-select-label">Device</InputLabel>
        <Select
          labelId="device-select-label"
          value={selectedDevice || ''}
          onChange={(e) => onDeviceSelect(e.target.value || null)}
          label="Device"
          disabled={isLoading || !!error || isControlLoading}
          sx={{ height: 32, fontSize: '0.75rem' }}
        >
          <MenuItem value="">
            <em>{isLoading ? 'Loading...' : 'None'}</em>
          </MenuItem>
          {availableHosts.map((device) => {
            const deviceIsLocked = isDeviceLocked(device.host_name);
            return (
              <MenuItem
                key={device.host_name}
                value={device.host_name}
                disabled={deviceIsLocked}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  opacity: deviceIsLocked ? 0.6 : 1,
                }}
              >
                {deviceIsLocked && <LockIcon sx={{ fontSize: '0.8rem', color: 'warning.main' }} />}
                <span>{device.device_name}</span>
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
          })}
        </Select>
      </FormControl>

      {/* Combined Take Control & Remote Panel Button */}
      <Button
        variant={isControlActive ? 'contained' : 'outlined'}
        size="small"
        onClick={onTakeControl}
        disabled={
          !selectedDevice || isLoading || !!error || isSelectedDeviceLocked || isControlLoading
        }
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
              ? `Device is locked by ${selectedDeviceHost?.lockedBy || 'another user'}`
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
