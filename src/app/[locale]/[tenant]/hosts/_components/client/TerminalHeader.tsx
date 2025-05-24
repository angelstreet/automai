'use client';

import { Monitor, Server, User, Key } from 'lucide-react';

import { Host } from '@/types/component/hostComponentType';

interface TerminalHeaderProps {
  host: Host;
  isConnected: boolean;
  isConnecting: boolean;
}

export function TerminalHeader({ host, isConnected, isConnecting }: TerminalHeaderProps) {
  const getOSIcon = () => {
    if (host.is_windows) {
      return '🪟';
    }
    if (host.device_type?.includes('linux') || host.os_type?.toLowerCase().includes('linux')) {
      return '🐧';
    }
    return '💻';
  };

  const getShellType = () => {
    if (host.is_windows) {
      return 'PowerShell/CMD';
    }
    return 'Bash/Shell';
  };

  return (
    <div className="bg-gray-900 text-gray-200 px-4 py-2 border-b border-gray-700">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-6">
          {/* Host Info */}
          <div className="flex items-center space-x-2">
            <Server className="h-4 w-4 text-blue-400" />
            <span className="font-medium">{host.name}</span>
            <span className="text-gray-400">
              ({host.ip_local || host.ip}:{host.port || 22})
            </span>
          </div>

          {/* OS Info */}
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getOSIcon()}</span>
            <span className="text-gray-300">{getShellType()}</span>
          </div>

          {/* User Info */}
          {host.user && (
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-green-400" />
              <span className="text-gray-300">{host.user}</span>
            </div>
          )}

          {/* Auth Type */}
          <div className="flex items-center space-x-2">
            <Key className="h-4 w-4 text-purple-400" />
            <span className="text-gray-300">{host.privateKey ? 'Private Key' : 'Password'}</span>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnecting
                ? 'bg-yellow-400 animate-pulse'
                : isConnected
                  ? 'bg-green-400'
                  : 'bg-red-400'
            }`}
          />
          <span className="text-xs text-gray-400">
            {isConnecting
              ? 'Establishing connection...'
              : isConnected
                ? 'Connected'
                : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
