import { useContext } from 'react';

import { HostManagerContext, HostManagerContextType } from '../contexts/HostManagerContext';

/**
 * Hook to access the HostManager context
 * This component provides access to host data and device control functionality
 */
export const useHostManager = (): HostManagerContextType => {
  const context = useContext(HostManagerContext);
  if (!context) {
    throw new Error('useHostManager must be used within a HostManagerProvider');
  }
  return context;
};
