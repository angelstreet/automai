'use client';

import { Lock, Monitor } from 'lucide-react';
import { useState } from 'react';

import { startBrowserSession, forceTakeControlBrowserHost } from '@/app/actions/browserActions';
import { Button } from '@/components/shadcn/button';
import { Host } from '@/types/component/hostComponentType';
import { User } from '@/types/service/userServiceType';

import { BrowserModalClient } from './BrowserModalClient';

interface BrowserActionsClientProps {
  initialHosts: Host[];
  currentUser: User;
}

export function BrowserActionsClient({ initialHosts, currentUser }: BrowserActionsClientProps) {
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeHost, setActiveHost] = useState<Host | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Filter to only show Linux and Windows hosts
  const browserHosts = initialHosts.filter(
    (host) => host.device_type === 'linux' || host.device_type === 'windows',
  );

  const handleHostChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    console.log(`[@component:BrowserActionsClient] Host selection changed to: ${newValue}`);
    setSelectedHostId(newValue);
  };

  const handleTakeControl = async () => {
    if (!selectedHostId) {
      console.warn(`[@component:BrowserActionsClient] No host selected for take control`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[@component:BrowserActionsClient] Taking control of host: ${selectedHostId}`);

      const selectedHost = browserHosts.find((host) => host.id === selectedHostId);
      const isOccupied = selectedHost?.reserved_by && selectedHost.reserved_by !== currentUser.id;

      // If host is occupied, force take control
      if (isOccupied) {
        const forceResult = await forceTakeControlBrowserHost(selectedHostId);
        if (!forceResult.success) {
          setError(forceResult.error || 'Failed to force take control');
          return;
        }
      }

      // Start session
      const result = await startBrowserSession(selectedHostId);

      if (result.success && result.data) {
        console.log(`[@component:BrowserActionsClient] Session started successfully`);
        if (result.data.host && result.data.sessionId) {
          setActiveHost(result.data.host);
          setSessionId(result.data.sessionId);
          setIsModalOpen(true);
        }
      } else {
        setError(result.error || 'Failed to start browser session');
      }
    } catch (error: any) {
      console.error(`[@component:BrowserActionsClient] Error taking control:`, error);
      setError(error.message || 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    console.log(`[@component:BrowserActionsClient] Closing browser modal`);
    setIsModalOpen(false);
    setActiveHost(null);
    setSessionId(null);
  };

  const selectedHost = browserHosts.find((host) => host.id === selectedHostId);
  const isHostLocked = selectedHost?.reserved_by && selectedHost.reserved_by !== currentUser.id;
  const isButtonDisabled = !selectedHostId || isLoading;

  if (browserHosts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Monitor className="h-4 w-4" />
        No Linux/Windows hosts available
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Host Selection Dropdown */}
        <div className="relative">
          <select
            value={selectedHostId}
            onChange={handleHostChange}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 min-w-[200px] cursor-pointer [&>option]:bg-white [&>option]:dark:bg-gray-700 [&>option]:text-black [&>option]:dark:text-white"
            style={{
              position: 'relative',
              zIndex: 10,
            }}
          >
            <option value="">Select host...</option>
            {browserHosts.map((host) => {
              const isLocked = host.reserved_by && host.reserved_by !== currentUser.id;
              const isMyHost = host.reserved_by === currentUser.id;

              return (
                <option key={host.id} value={host.id}>
                  {host.name} ({host.device_type})
                  {isMyHost ? ' (You)' : isLocked ? ' (Locked)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Lock Icon for Locked Hosts */}
        {isHostLocked && <Lock className="h-4 w-4 text-red-500" />}

        {/* Take Control Button */}
        <Button
          size="sm"
          onClick={handleTakeControl}
          disabled={isButtonDisabled}
          className="h-8 gap-1"
        >
          <Monitor className="h-4 w-4" />
          {isLoading ? 'Taking Control...' : 'Take Control'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed top-4 right-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Browser Modal */}
      <BrowserModalClient
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        host={activeHost}
        sessionId={sessionId}
      />
    </>
  );
}
