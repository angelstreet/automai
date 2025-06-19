import { useState, useCallback } from 'react';
import { Host } from '../../types/common/Host_Types';
import { androidTvRemoteConfig } from '../../config/remote/androidTvRemote';
import { buildServerUrl } from '../../utils/frontendUtils';

interface AndroidTvSession {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

interface UseAndroidTvReturn {
  session: AndroidTvSession;
  isLoading: boolean;
  lastAction: string;
  layoutConfig: typeof androidTvRemoteConfig;
  handleConnect: () => Promise<void>;
  handleDisconnect: () => Promise<void>;
  handleRemoteCommand: (command: string, params?: any) => Promise<void>;
}

export const useAndroidTv = (host: Host): UseAndroidTvReturn => {
  const [session, setSession] = useState<AndroidTvSession>({
    connected: false,
    connecting: false,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState('');

  const handleConnect = useCallback(async () => {
    setSession((prev) => ({ ...prev, connecting: true, error: null }));
    setLastAction('Connecting to Android TV...');

    try {
      // Use existing host connection - assume it's already established
      // when the component is loaded
      setSession({
        connected: true,
        connecting: false,
        error: null,
      });
      setLastAction('Connected to Android TV');
      console.log(`[@hook:useAndroidTv] Connected to Android TV: ${host.host_name}`);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to connect to Android TV';
      setSession({
        connected: false,
        connecting: false,
        error: errorMessage,
      });
      setLastAction(`Error: ${errorMessage}`);
      console.error(`[@hook:useAndroidTv] Connection failed:`, error);
    }
  }, [host]);

  const handleDisconnect = useCallback(async () => {
    setLastAction('Disconnecting...');

    try {
      setSession({
        connected: false,
        connecting: false,
        error: null,
      });
      setLastAction('Disconnected');
      console.log(`[@hook:useAndroidTv] Disconnected from Android TV: ${host.host_name}`);
    } catch (error: any) {
      console.error(`[@hook:useAndroidTv] Disconnect error:`, error);
    }
  }, [host]);

  const handleRemoteCommand = useCallback(
    async (command: string, params?: any) => {
      if (!session.connected || isLoading) return;

      setIsLoading(true);
      setLastAction(`Sending ${command}...`);

      try {
        // Map TV commands to ADB key codes
        const keyMap: { [key: string]: string } = {
          POWER: 'POWER',
          UP: 'DPAD_UP',
          DOWN: 'DPAD_DOWN',
          LEFT: 'DPAD_LEFT',
          RIGHT: 'DPAD_RIGHT',
          SELECT: 'DPAD_CENTER',
          BACK: 'BACK',
          HOME: 'HOME',
          MENU: 'MENU',
          VOLUME_UP: 'VOLUME_UP',
          VOLUME_DOWN: 'VOLUME_DOWN',
          VOLUME_MUTE: 'VOLUME_MUTE',
          PLAY_PAUSE: 'MEDIA_PLAY_PAUSE',
          REWIND: 'MEDIA_REWIND',
          FAST_FORWARD: 'MEDIA_FAST_FORWARD',
        };

        const adbKey = keyMap[command] || command;

        // Use the same routing pattern as Android Mobile remote
        const response = await fetch(buildServerUrl('/server/remote/execute-command'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: host,
            command: 'press_key',
            params: { key: adbKey },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setLastAction(`Sent ${command}`);
            console.log(`[@hook:useAndroidTv] Successfully sent command: ${command}`);
          } else {
            setLastAction(`Error: ${result.error}`);
            console.error(`[@hook:useAndroidTv] Command failed:`, result.error);
          }
        } else {
          const error = await response.text();
          setLastAction(`Error: ${error}`);
          console.error(`[@hook:useAndroidTv] Command failed:`, error);
        }
      } catch (error: any) {
        setLastAction(`Error: ${error.message}`);
        console.error(`[@hook:useAndroidTv] Command error:`, error);
      } finally {
        setIsLoading(false);
      }
    },
    [session.connected, isLoading, host],
  );

  return {
    session,
    isLoading,
    lastAction,
    layoutConfig: androidTvRemoteConfig,
    handleConnect,
    handleDisconnect,
    handleRemoteCommand,
  };
};
