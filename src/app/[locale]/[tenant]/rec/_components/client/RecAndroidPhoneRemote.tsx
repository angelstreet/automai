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
  RotateCcw,
  Camera,
  Phone,
} from 'lucide-react';
import { useState } from 'react';

import { AdbKeyType, executeAdbKeyCommand } from '@/app/actions/streamAdbActions';

interface RecAndroidPhoneRemoteProps {
  hostId: string;
  deviceId: string;
}

export function RecAndroidPhoneRemote({ hostId, deviceId }: RecAndroidPhoneRemoteProps) {
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
      <h3 className="text-sm font-medium mb-2 text-center">📱 Android Phone Remote</h3>

      {/* Direction pad */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('UP')}
            disabled={isLoading}
            className="w-full p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Up"
          >
            <ArrowUp size={18} />
          </button>
        </div>
        <div className="col-start-1">
          <button
            onClick={() => handleKeyPress('LEFT')}
            disabled={isLoading}
            className="w-full p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Left"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('SELECT')}
            disabled={isLoading}
            className="w-full p-2 bg-blue-600 text-white rounded flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
            aria-label="Select"
          >
            OK
          </button>
        </div>
        <div className="col-start-3">
          <button
            onClick={() => handleKeyPress('RIGHT')}
            disabled={isLoading}
            className="w-full p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Right"
          >
            <ArrowRight size={18} />
          </button>
        </div>
        <div className="col-start-2">
          <button
            onClick={() => handleKeyPress('DOWN')}
            disabled={isLoading}
            className="w-full p-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            aria-label="Down"
          >
            <ArrowDown size={18} />
          </button>
        </div>
      </div>

      {/* Phone-specific buttons */}
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

      {/* Phone app shortcuts */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => handleKeyPress('CAMERA')}
          disabled={isLoading}
          className="p-2 bg-green-600 text-white rounded flex items-center justify-center hover:bg-green-700 disabled:opacity-50"
          aria-label="Camera"
        >
          <Camera size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('CALL')}
          disabled={isLoading}
          className="p-2 bg-green-600 text-white rounded flex items-center justify-center hover:bg-green-700 disabled:opacity-50"
          aria-label="Phone"
        >
          <Phone size={18} />
        </button>
        <button
          onClick={() => handleKeyPress('ENDCALL')}
          disabled={isLoading}
          className="p-2 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 disabled:opacity-50"
          aria-label="End Call"
        >
          <RotateCcw size={18} />
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
