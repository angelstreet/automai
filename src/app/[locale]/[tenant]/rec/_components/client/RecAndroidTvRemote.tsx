'use client';

import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CornerDownLeft,
  Home,
  Menu,
  Volume,
  Volume1,
  Volume2,
  Power,
  Play,
  Pause,
  FastForward,
  Rewind,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import {
  AdbKeyType,
  executeAdbKeyCommand,
  connectToHost,
  disconnectFromHost,
} from '@/app/actions/adbActions';

interface RecAndroidTvRemoteProps {
  hostId: string;
  deviceId: string;
}

export function RecAndroidTvRemote({ hostId, deviceId }: RecAndroidTvRemoteProps) {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Establish SSH + ADB connection on mount
  useEffect(() => {
    const establishConnection = async () => {
      setIsConnecting(true);
      setConnectionError(null);
      setLastAction('Connecting to TV device...');

      try {
        // Add a timeout to prevent hanging
        const connectionPromise = connectToHost(hostId, deviceId);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000),
        );

        const result = (await Promise.race([connectionPromise, timeoutPromise])) as any;
        if (result.success) {
          setLastAction('Connected successfully');
          setConnectionError(null);
        } else {
          setConnectionError(result.error || 'Failed to connect');
          setLastAction(`Connection failed: ${result.error}`);
        }
      } catch (error: any) {
        setConnectionError(error.message);
        setLastAction(`Connection error: ${error.message}`);
      } finally {
        setIsConnecting(false);
      }
    };

    establishConnection();

    // Cleanup: disconnect when component unmounts
    return () => {
      disconnectFromHost(hostId).catch((err) => {
        console.error('Failed to disconnect on unmount:', err);
      });
    };
  }, [hostId, deviceId]);

  // Handle key button press
  const handleKeyPress = async (key: AdbKeyType) => {
    if (isLoading || isConnecting) return;

    setIsLoading(true);
    setLastAction(`Sending ${key}...`);

    try {
      const result = await executeAdbKeyCommand(hostId, deviceId, key);

      if (result.success) {
        setLastAction(`Sent ${key}`);
      } else {
        setLastAction(`Error: ${result.error}`);
      }
    } catch (error: any) {
      setLastAction(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg w-full max-w-xs">
      <h3 className="text-sm font-medium mb-2 text-center">📺 Android TV Remote</h3>

      {/* Connection status */}
      {isConnecting && (
        <div className="mb-2 p-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs text-center">
          Connecting to TV device...
        </div>
      )}
      {connectionError && (
        <div className="mb-2 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs text-center">
          {connectionError}
        </div>
      )}

      {/* Direction pad */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('UP')}
            disabled={isLoading || isConnecting}
            className="w-full p-3 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Up"
          >
            <ArrowUp size={20} />
          </button>
        </div>
        <div className="col-start-1">
          <button
            onClick={() => handleKeyPress('LEFT')}
            disabled={isLoading || isConnecting}
            className="w-full p-3 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Left"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('SELECT')}
            disabled={isLoading || isConnecting}
            className="w-full p-3 bg-blue-600 text-white rounded flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
            aria-label="Select"
          >
            OK
          </button>
        </div>
        <div className="col-start-3">
          <button
            onClick={() => handleKeyPress('RIGHT')}
            disabled={isLoading || isConnecting}
            className="w-full p-3 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Right"
          >
            <ArrowRight size={20} />
          </button>
        </div>
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('DOWN')}
            disabled={isLoading || isConnecting}
            className="w-full p-3 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Down"
          >
            <ArrowDown size={20} />
          </button>
        </div>
      </div>

      {/* Media controls */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <button
          onClick={() => handleKeyPress('MEDIA_REWIND')}
          disabled={isLoading || isConnecting}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Rewind"
        >
          <Rewind size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('MEDIA_PLAY_PAUSE')}
          disabled={isLoading || isConnecting}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Play/Pause"
        >
          <Play size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('MEDIA_PAUSE')}
          disabled={isLoading || isConnecting}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Pause"
        >
          <Pause size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('MEDIA_FAST_FORWARD')}
          disabled={isLoading || isConnecting}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Fast Forward"
        >
          <FastForward size={18} />
        </button>
      </div>

      {/* System buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => handleKeyPress('BACK')}
          disabled={isLoading || isConnecting}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Back"
        >
          <CornerDownLeft size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('HOME')}
          disabled={isLoading || isConnecting}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Home"
        >
          <Home size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('MENU')}
          disabled={isLoading || isConnecting}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Menu"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Volume and power buttons */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        <button
          onClick={() => handleKeyPress('VOLUME_DOWN')}
          disabled={isLoading || isConnecting}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Volume Down"
        >
          <Volume size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('VOLUME_MUTE')}
          disabled={isLoading || isConnecting}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Volume Mute"
        >
          <Volume1 size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('VOLUME_UP')}
          disabled={isLoading || isConnecting}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Volume Up"
        >
          <Volume2 size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('POWER')}
          disabled={isLoading || isConnecting}
          className="p-2 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
          aria-label="Power"
        >
          <Power size={18} />
        </button>
      </div>

      {/* Last action status */}
      {lastAction && (
        <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          {lastAction}
        </div>
      )}
    </div>
  );
}
