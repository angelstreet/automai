'use client';

import { useEffect } from 'react';

import { getTeamEnvironmentVariables } from '@/app/actions/environmentVariablesAction';
import { EnvironmentVariable } from '@/types/context/environmentVariablesContextType';

import { EnvironmentVariablesEvents } from '../../constants';

interface EnvironmentVariablesEventListenerClientProps {
  teamId: string;
  onVariablesRefreshed: (variables: EnvironmentVariable[]) => void;
}

export function EnvironmentVariablesEventListenerClient({
  teamId,
  onVariablesRefreshed,
}: EnvironmentVariablesEventListenerClientProps) {
  useEffect(() => {
    // Handle refresh event
    const handleRefresh = async () => {
      console.log(
        '[@component:EnvironmentVariablesEventListenerClient] Refreshing environment variables',
      );

      const result = await getTeamEnvironmentVariables(teamId);

      if (result.success && result.data) {
        onVariablesRefreshed(result.data);
      }
    };

    // Register event listeners
    window.addEventListener(
      EnvironmentVariablesEvents.REFRESH_ENVIRONMENT_VARIABLES,
      handleRefresh as EventListener,
    );

    // Cleanup on unmount
    return () => {
      window.removeEventListener(
        EnvironmentVariablesEvents.REFRESH_ENVIRONMENT_VARIABLES,
        handleRefresh as EventListener,
      );
    };
  }, [teamId, onVariablesRefreshed]);

  return null;
}
