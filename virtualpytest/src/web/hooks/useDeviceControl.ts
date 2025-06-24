/**
 * @deprecated Use useHostManager instead
 * This file is maintained for backward compatibility only
 */
import { useCallback, useState, useEffect, useRef } from 'react';

import { Host } from '../types/common/Host_Types';

import { useUserSession } from './useUserSession';
import { useHostManager } from './useHostManager';

/**
 * Device Control Hook - Business Logic for Device Locking/Unlocking
 *
 * Handles device control operations via server endpoints using consistent user identification.
 */
export const useDeviceControl = useHostManager;

// Re-export the hook as the default export
export default useHostManager;
