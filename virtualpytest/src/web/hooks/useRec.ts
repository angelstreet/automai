import { useState, useEffect } from 'react';

import { Host, Device } from '../types/common/Host_Types';
import { useHostManager } from './useHostManager';

/**
 * Hook for managing recording/AV device discovery and display
 * Simplified to only handle device discovery - control logic is in RecHostStreamModal
 */
export const useRec = () => {
  const {
    getDevicesByCapability,
    isLoading: contextLoading,
    error: contextError,
  } = useHostManager();

  const [avDevices, setAvDevices] = useState<{ host: Host; device: Device }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ... existing code ...
};
