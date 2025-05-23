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
import { useState } from 'react';

import { AdbKeyType, executeAdbKeyCommand } from '@/app/actions/adbActions';

interface RecAndroidTvRemoteProps {
  hostId: string;
  deviceId: string;
}

export function RecAndroidTvRemote({ hostId, deviceId }: RecAndroidTvRemoteProps) {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle key button press
  const handleKeyPress = async (key: AdbKeyType) => {
    if (isLoading) return;

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

      {/* Direction pad */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('UP')}
            disabled={isLoading}
            className="w-full p-3 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Up"
          >
            <ArrowUp size={20} />
          </button>
        </div>
        <div className="col-start-1">
          <button
            onClick={() => handleKeyPress('LEFT')}
            disabled={isLoading}
            className="w-full p-3 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Left"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('SELECT')}
            disabled={isLoading}
            className="w-full p-3 bg-blue-600 text-white rounded flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
            aria-label="Select"
          >
            OK
          </button>
        </div>
        <div className="col-start-3">
          <button
            onClick={() => handleKeyPress('RIGHT')}
            disabled={isLoading}
            className="w-full p-3 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Right"
          >
            <ArrowRight size={20} />
          </button>
        </div>
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('DOWN')}
            disabled={isLoading}
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
          disabled={isLoading}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Rewind"
        >
          <Rewind size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('MEDIA_PLAY_PAUSE')}
          disabled={isLoading}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Play/Pause"
        >
          <Play size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('MEDIA_PAUSE')}
          disabled={isLoading}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Pause"
        >
          <Pause size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('MEDIA_FAST_FORWARD')}
          disabled={isLoading}
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
          disabled={isLoading}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Back"
        >
          <CornerDownLeft size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('HOME')}
          disabled={isLoading}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Home"
        >
          <Home size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('MENU')}
          disabled={isLoading}
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
          disabled={isLoading}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Volume Down"
        >
          <Volume size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('VOLUME_MUTE')}
          disabled={isLoading}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Volume Mute"
        >
          <Volume1 size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('VOLUME_UP')}
          disabled={isLoading}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          aria-label="Volume Up"
        >
          <Volume2 size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('POWER')}
          disabled={isLoading}
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
