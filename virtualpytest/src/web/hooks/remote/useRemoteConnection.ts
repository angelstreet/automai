import { useState, useCallback } from 'react';
import { RemoteType } from '../../types/remote/remoteTypes';
import { useRegistration } from '../../contexts/RegistrationContext';

interface RemoteState {
  isLoading: boolean;
  error: string | null;
}

const initialState: RemoteState = {
  isLoading: false,
  error: null,
};

export function useRemoteConnection(remoteType: RemoteType) {
  const { buildServerUrl } = useRegistration();
  
  // Simple state management for loading and errors only
  const [remoteState, setRemoteState] = useState<RemoteState>(initialState);

  // Show remote UI via abstract remote controller
  const showRemote = useCallback(async () => {
    console.log(`[@hook:useRemoteConnection] Showing ${remoteType} remote via abstract controller`);
    setRemoteState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(buildServerUrl('/server/remote/show'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to show remote');
      }

      console.log(`[@hook:useRemoteConnection] Remote ${remoteType} shown successfully`);
    } catch (error: any) {
      console.error(`[@hook:useRemoteConnection] Failed to show remote:`, error);
      setRemoteState(prev => ({ ...prev, error: error.message }));
    } finally {
      setRemoteState(prev => ({ ...prev, isLoading: false }));
    }
  }, [remoteType, buildServerUrl]);

  // Hide remote UI via abstract remote controller
  const hideRemote = useCallback(async () => {
    console.log(`[@hook:useRemoteConnection] Hiding ${remoteType} remote via abstract controller`);
    setRemoteState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(buildServerUrl('/server/remote/hide'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to hide remote');
      }

      console.log(`[@hook:useRemoteConnection] Remote ${remoteType} hidden successfully`);
    } catch (error: any) {
      console.error(`[@hook:useRemoteConnection] Failed to hide remote:`, error);
      setRemoteState(prev => ({ ...prev, error: error.message }));
    } finally {
      setRemoteState(prev => ({ ...prev, isLoading: false }));
    }
  }, [remoteType, buildServerUrl]);

  // Send command to remote controller
  const sendCommand = useCallback(async (command: string, params?: any) => {
    console.log(`[@hook:useRemoteConnection] Sending command: ${command}`, params);
    setRemoteState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(buildServerUrl('/server/remote/send-command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          params: params || {},
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Command failed');
      }

      console.log(`[@hook:useRemoteConnection] Command ${command} sent successfully`);
    } catch (error: any) {
      console.error(`[@hook:useRemoteConnection] Command ${command} failed:`, error);
      setRemoteState(prev => ({ ...prev, error: error.message }));
    } finally {
      setRemoteState(prev => ({ ...prev, isLoading: false }));
    }
  }, [buildServerUrl]);

  // Convenience methods for common commands
  const pressKey = useCallback(async (key: string) => {
    await sendCommand('press_key', { key });
  }, [sendCommand]);

  const navigate = useCallback(async (direction: 'up' | 'down' | 'left' | 'right') => {
    const keyMap = {
      up: 'DPAD_UP',
      down: 'DPAD_DOWN', 
      left: 'DPAD_LEFT',
      right: 'DPAD_RIGHT'
    };
    await pressKey(keyMap[direction]);
  }, [pressKey]);

  const select = useCallback(async () => {
    await pressKey('DPAD_CENTER');
  }, [pressKey]);

  const back = useCallback(async () => {
    await pressKey('BACK');
  }, [pressKey]);

  const home = useCallback(async () => {
    await pressKey('HOME');
  }, [pressKey]);

  return {
    // State
    isLoading: remoteState.isLoading,
    error: remoteState.error,

    // Remote control methods
    showRemote,
    hideRemote,
    sendCommand,

    // Convenience methods
    pressKey,
    navigate,
    select,
    back,
    home,
  };
}