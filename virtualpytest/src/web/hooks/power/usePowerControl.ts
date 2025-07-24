/**
 * Power Control Hook
 *
 * Hook for managing power controller operations (status, commands)
 */

import { useState, useCallback } from 'react';
import {
  PowerStatus,
  PowerCommand,
  PowerControlResponse,
  PowerStatusResponse,
} from '../../types/power';
import { Host } from '../../types/common/Host_Types';

interface UsePowerControlOptions {
  host: Host;
  device_id: string;
}

interface UsePowerControlReturn {
  // Status
  powerStatus: PowerStatus | null;
  isLoadingStatus: boolean;
  statusError: string | null;

  // Commands
  isExecutingCommand: boolean;
  commandError: string | null;

  // Actions
  getPowerStatus: () => Promise<void>;
  executePowerCommand: (command: PowerCommand) => Promise<boolean>;
  clearErrors: () => void;
}

export const usePowerControl = ({
  host,
  device_id,
}: UsePowerControlOptions): UsePowerControlReturn => {
  // Status state
  const [powerStatus, setPowerStatus] = useState<PowerStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Command state
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);

  // Get power status
  const getPowerStatus = useCallback(async () => {
    if (!host || !device_id) return;

    setIsLoadingStatus(true);
    setStatusError(null);

    try {
      const response = await fetch('/server/power/getStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host,
          device_id,
        }),
      });

      const data: PowerStatusResponse = await response.json();

      if (data.success && data.status) {
        setPowerStatus(data.status);
      } else {
        setStatusError(data.error || 'Failed to get power status');
        setPowerStatus(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      setStatusError(errorMessage);
      setPowerStatus(null);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [host, device_id]);

  // Execute power command
  const executePowerCommand = useCallback(
    async (command: PowerCommand): Promise<boolean> => {
      if (!host || !device_id) return false;

      setIsExecutingCommand(true);
      setCommandError(null);

      try {
        const response = await fetch('/server/power/executeCommand', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host,
            device_id,
            command,
            params: {},
          }),
        });

        const data: PowerControlResponse = await response.json();

        if (data.success) {
          // Update power status after successful command
          // For power_on/power_off, we can immediately update the status
          if (command === 'power_on') {
            setPowerStatus((prev) => (prev ? { ...prev, power_state: 'on' } : null));
          } else if (command === 'power_off') {
            setPowerStatus((prev) => (prev ? { ...prev, power_state: 'off' } : null));
          }
          // For reboot, status might be unknown during the process

          return true;
        } else {
          setCommandError(data.error || `Failed to execute ${command}`);
          return false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Network error';
        setCommandError(errorMessage);
        return false;
      } finally {
        setIsExecutingCommand(false);
      }
    },
    [host, device_id],
  );

  // Clear errors
  const clearErrors = useCallback(() => {
    setStatusError(null);
    setCommandError(null);
  }, []);

  return {
    // Status
    powerStatus,
    isLoadingStatus,
    statusError,

    // Commands
    isExecutingCommand,
    commandError,

    // Actions
    getPowerStatus,
    executePowerCommand,
    clearErrors,
  };
};
