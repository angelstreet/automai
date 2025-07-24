/**
 * Power Button Component
 *
 * Minimalist power button with icon only, color-coded by power state
 */

import React, { useEffect, useCallback } from 'react';
import { IconButton, CircularProgress, Tooltip } from '@mui/material';
import { Power as PowerIcon } from '@mui/icons-material';
import { usePowerControl } from '../../../hooks/power/usePowerControl';
import { useToast } from '../../../hooks/useToast';
import { Host, Device } from '../../../types/common/Host_Types';

interface PowerButtonProps {
  host: Host;
  device: Device;
  disabled?: boolean;
}

export const PowerButton: React.FC<PowerButtonProps> = ({ host, device, disabled = false }) => {
  const { showError } = useToast();

  // Power control hook
  const {
    powerStatus,
    isLoadingStatus,
    statusError,
    isExecutingCommand,
    commandError,
    getPowerStatus,
    executePowerCommand,
    clearErrors,
  } = usePowerControl({
    host,
    device_id: device.device_id,
  });

  // Get initial power status when component mounts
  useEffect(() => {
    if (!disabled) {
      getPowerStatus();
    }
  }, [disabled, getPowerStatus]);

  // Show errors via toast
  useEffect(() => {
    if (statusError) {
      showError(`Power status error: ${statusError}`);
      clearErrors();
    }
  }, [statusError, showError, clearErrors]);

  useEffect(() => {
    if (commandError) {
      showError(`Power command error: ${commandError}`);
      clearErrors();
    }
  }, [commandError, showError, clearErrors]);

  // Handle power button click - toggle power state
  const handlePowerClick = useCallback(async () => {
    if (!powerStatus || disabled || isExecutingCommand) return;

    const currentState = powerStatus.power_state;

    // Determine command based on current state
    let command: 'power_on' | 'power_off';
    if (currentState === 'on') {
      command = 'power_off';
    } else {
      // For 'off' or 'unknown' state, try to power on
      command = 'power_on';
    }

    console.log(`[@component:PowerButton] Executing ${command} for device ${device.device_id}`);

    const success = await executePowerCommand(command);

    if (success) {
      console.log(`[@component:PowerButton] ${command} executed successfully`);
    } else {
      console.log(`[@component:PowerButton] ${command} failed`);
    }
  }, [powerStatus, disabled, isExecutingCommand, executePowerCommand, device.device_id]);

  // Determine button color based on power state
  const getButtonColor = () => {
    if (disabled || !powerStatus) return '#666'; // Grey when disabled or no status

    switch (powerStatus.power_state) {
      case 'on':
        return '#ffc107'; // Yellow when on
      case 'off':
        return '#f44336'; // Red when off
      case 'unknown':
      default:
        return '#666'; // Grey when unknown
    }
  };

  // Determine tooltip text
  const getTooltipText = () => {
    if (disabled) return 'Take control first to use power control';
    if (isLoadingStatus) return 'Loading power status...';
    if (isExecutingCommand) return 'Executing power command...';
    if (!powerStatus) return 'Power status unknown';

    const currentState = powerStatus.power_state;
    if (currentState === 'on') {
      return 'Power On - Click to turn off';
    } else if (currentState === 'off') {
      return 'Power Off - Click to turn on';
    } else {
      return 'Power Unknown - Click to turn on';
    }
  };

  const buttonColor = getButtonColor();
  const tooltipText = getTooltipText();
  const isLoading = isLoadingStatus || isExecutingCommand;
  const isButtonDisabled = disabled || isLoading;

  return (
    <Tooltip title={tooltipText} arrow>
      <span>
        <IconButton
          onClick={handlePowerClick}
          disabled={isButtonDisabled}
          size="small"
          sx={{
            color: buttonColor,
            '&:hover': {
              color: isButtonDisabled ? buttonColor : '#fff',
              backgroundColor: isButtonDisabled ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
            },
            '&.Mui-disabled': {
              color: '#666',
            },
            transition: 'color 0.2s ease-in-out',
          }}
          aria-label={`Power control - ${powerStatus?.power_state || 'unknown'}`}
        >
          {isLoading ? (
            <CircularProgress size={20} sx={{ color: '#666' }} />
          ) : (
            <PowerIcon fontSize="small" />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
};
