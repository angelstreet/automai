import { useState, useCallback } from 'react';
import { RemoteType } from '../../types/remote/remoteTypes';
import { useRegistration } from '../../contexts/RegistrationContext';

interface RemoteState {
  isVisible: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: RemoteState = {
  isVisible: false,
  isLoading: false,
  error: null,
};

export function useRemoteConnection(remoteType: RemoteType) {
  const { buildServerUrl } = useRegistration();
  
  // Simple state management for remote UI
  const [remoteState, setRemoteState] = useState<RemoteState>(initialState);

  // Show remote UI
  const showRemote = useCallback(() => {
    console.log(`[@hook:useRemoteConnection] Showing ${remoteType} remote UI`);
    setRemoteState(prev => ({ ...prev, isVisible: true, error: null }));
  }, [remoteType]);

  // Hide remote UI
  const hideRemote = useCallback(() => {
    console.log(`[@hook:useRemoteConnection] Hiding ${remoteType} remote UI`);
    setRemoteState(prev => ({ ...prev, isVisible: false, error: null }));
  }, [remoteType]);

  // Send command to abstract remote controller via Flask
  const sendCommand = useCallback(async (command: string, params: any = {}) => {
    setRemoteState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log(`[@hook:useRemoteConnection] Sending command to ${remoteType}:`, { command, params });
      
      // Use abstract remote controller endpoint
      const response = await fetch(buildServerUrl('/server/remote/execute-action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: {
            command: command,
            params: params
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`[@hook:useRemoteConnection] Command ${command} executed successfully`);
      } else {
        const errorMsg = result.error || 'Command execution failed';
        console.error(`[@hook:useRemoteConnection] Command failed:`, errorMsg);
        setRemoteState(prev => ({ ...prev, error: errorMsg }));
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Network error';
      console.error(`[@hook:useRemoteConnection] Command error:`, err);
      setRemoteState(prev => ({ ...prev, error: errorMsg }));
    } finally {
      setRemoteState(prev => ({ ...prev, isLoading: false }));
    }
  }, [remoteType, buildServerUrl]);

  // Convenience methods for common commands
  const pressKey = useCallback((key: string) => {
    return sendCommand('send_key', { key });
  }, [sendCommand]);

  const navigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    return sendCommand('navigate', { direction });
  }, [sendCommand]);

  const select = useCallback(() => {
    return sendCommand('select');
  }, [sendCommand]);

  const back = useCallback(() => {
    return sendCommand('back');
  }, [sendCommand]);

  const home = useCallback(() => {
    return sendCommand('home');
  }, [sendCommand]);

  const sendText = useCallback((text: string) => {
    return sendCommand('send_text', { text });
  }, [sendCommand]);

  return {
    // State
    isVisible: remoteState.isVisible,
    isLoading: remoteState.isLoading,
    error: remoteState.error,
    
    // Remote UI control
    showRemote,
    hideRemote,
    
    // Command sending
    sendCommand,
    
    // Convenience methods
    pressKey,
    navigate,
    select,
    back,
    home,
    sendText,
  };
}