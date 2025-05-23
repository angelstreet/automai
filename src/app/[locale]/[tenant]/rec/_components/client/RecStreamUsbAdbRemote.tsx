'use client';

import { Home, Power, RotateCcw } from 'lucide-react';

import { executeAdbKeyCommand } from '@/app/actions/adbActions';

interface RecStreamUsbAdbRemoteProps {
  hostId: string;
  deviceId: string;
}

export function RecStreamUsbAdbRemote({ hostId, deviceId }: RecStreamUsbAdbRemoteProps) {
  // Function to send key commands
  const sendKey = async (key: string) => {
    try {
      console.log(`[@component:RecStreamUsbAdbRemote] Sending key: ${key}`);
      const result = await executeAdbKeyCommand(hostId, deviceId, key as any);
      if (!result.success) {
        console.error(`[@component:RecStreamUsbAdbRemote] Failed to send key:`, result.error);
      }
    } catch (error) {
      console.error(`[@component:RecStreamUsbAdbRemote] Error sending key:`, error);
    }
  };

  return (
    <div className="w-full p-2 flex flex-col items-center gap-4">
      <h3 className="text-lg font-medium mb-2">USB ADB Remote</h3>

      {/* Placeholder for USB ADB remote controls */}
      <div className="text-sm text-gray-500 text-center mb-4">
        USB ADB Remote Control
        <p className="mt-2 text-xs">Connected to device: {deviceId}</p>
      </div>

      {/* We'll implement actual controls later */}
      <div className="w-full grid grid-cols-3 gap-2">
        <button
          className="p-3 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center justify-center"
          onClick={() => sendKey('POWER')}
        >
          <Power size={20} />
        </button>
        <button
          className="p-3 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center justify-center"
          onClick={() => sendKey('HOME')}
        >
          <Home size={20} />
        </button>
        <button
          className="p-3 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center justify-center"
          onClick={() => sendKey('BACK')}
        >
          <RotateCcw size={20} />
        </button>
      </div>

      <div className="text-xs text-center text-gray-400 mt-4">
        Full remote controls will be implemented in next phase
      </div>
    </div>
  );
}
