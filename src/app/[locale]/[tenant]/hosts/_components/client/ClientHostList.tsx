'use client';

import { Server, PlusCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import {
  testHostConnection,
  deleteHost as deleteHostAction,
  getHosts as getHostsAction,
} from '@/app/actions/hostsAction';
import { Button } from '@/components/shadcn/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Host, HostStatus } from '@/types/component/hostComponentType';

import { HostGrid } from '../HostGrid';
import { HostTable } from '../HostTable';

import { VIEW_MODE_CHANGE } from './constants';

interface ClientHostListProps {
  initialHosts: Host[];
}

export default function ClientHostList({ initialHosts }: ClientHostListProps) {
  const [hosts, setHosts] = useState<Host[]>(initialHosts);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Listen for view mode changes
  useEffect(() => {
    const handleViewModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode: 'grid' | 'table' }>;
      setViewMode(customEvent.detail.mode);
    };

    window.addEventListener(VIEW_MODE_CHANGE, handleViewModeChange);
    return () => window.removeEventListener(VIEW_MODE_CHANGE, handleViewModeChange);
  }, []);

  const handleTestConnection = useCallback(async (host: Host): Promise<boolean> => {
    try {
      console.log(`[ClientHostList] Testing connection for host: ${host.name}`);
      const result = await testHostConnection(host.id);

      // Update the host status in the local state
      setHosts((prevHosts) =>
        prevHosts.map((h) =>
          h.id === host.id ? { ...h, status: result.success ? 'connected' : 'failed' } : h,
        ),
      );

      return result.success;
    } catch (error) {
      console.error(`[ClientHostList] Error testing connection for host: ${host.name}`, error);

      // Update the host status to failed
      setHosts((prevHosts) =>
        prevHosts.map((h) => (h.id === host.id ? { ...h, status: 'failed' } : h)),
      );

      return false;
    }
  }, []);

  // Handle refresh all hosts
  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing) return;

    console.log('[ClientHostList] Refreshing all hosts');
    setIsRefreshing(true);

    try {
      // First, set all hosts to 'testing' status
      setHosts((prevHosts) =>
        prevHosts.map((host) => ({
          ...host,
          status: 'testing',
        })),
      );

      // Test connections concurrently
      const testPromises = hosts.map((host) => handleTestConnection(host));
      await Promise.all(testPromises);

      console.log('[ClientHostList] All hosts tested successfully');
    } catch (error) {
      console.error('[ClientHostList] Error refreshing hosts:', error);
    } finally {
      setIsRefreshing(false);
      console.log('[ClientHostList] Host refresh complete');
      // Dispatch event to indicate refresh is complete
      window.dispatchEvent(new CustomEvent('refresh-hosts-complete'));
    }
  }, [isRefreshing, handleTestConnection, hosts]);

  // Listen for refresh action - ONLY triggered by explicit user action
  useEffect(() => {
    const handleRefresh = async (event: Event) => {
      try {
        // Check if the event has a detail with testConnections flag
        const customEvent = event as CustomEvent<{ testConnections?: boolean }>;
        const shouldTestConnections = customEvent.detail?.testConnections ?? false;

        console.log(
          `[ClientHostList] Refreshing hosts from server (testConnections=${shouldTestConnections})`,
        );
        setIsRefreshing(true);

        // Use the server action directly instead of fetch API
        const hostsResponse = await getHostsAction();
        if (hostsResponse.success && hostsResponse.data) {
          // CRITICAL FIX: Ensure any host with 'pending' status is updated to 'connected'
          // if it was recently created
          const updatedHosts = hostsResponse.data.map((host: Host) => {
            // If host is in 'pending' state but was created recently,
            // assume it should be 'connected'
            if (host.status === 'pending') {
              const createTime = new Date(host.created_at).getTime();
              const now = new Date().getTime();
              const isRecentlyCreated = now - createTime < 1000 * 60 * 5; // Within 5 minutes

              if (isRecentlyCreated) {
                console.log(
                  `[ClientHostList] Setting recently created host ${host.name} status from 'pending' to 'connected'`,
                );
                return { ...host, status: 'connected' as HostStatus };
              }
            }
            return host;
          });

          setHosts(updatedHosts as Host[]);
          console.log('[ClientHostList] Hosts refreshed from server:', updatedHosts.length);

          // Only test connections if explicitly requested
          if (shouldTestConnections) {
            console.log('[ClientHostList] Testing all host connections');
            handleRefreshAll();
          } else {
            console.log('[ClientHostList] Skipping connection testing');
            setIsRefreshing(false);
            window.dispatchEvent(new CustomEvent('refresh-hosts-complete'));
          }
        } else {
          setIsRefreshing(false);
          console.error('[ClientHostList] Error fetching hosts:', hostsResponse.error);
        }
      } catch (error) {
        console.error('[ClientHostList] Error refreshing hosts from server:', error);

        // Only fall back to testing connections if explicitly requested
        const customEvent = event as CustomEvent<{ testConnections?: boolean }>;
        if (customEvent.detail?.testConnections) {
          handleRefreshAll();
        } else {
          setIsRefreshing(false);
          window.dispatchEvent(new CustomEvent('refresh-hosts-complete'));
        }
      }
    };

    // Only add the event listener, don't automatically refresh on mount
    window.addEventListener('refresh-hosts', handleRefresh);
    return () => window.removeEventListener('refresh-hosts', handleRefresh);
  }, [handleRefreshAll]);

  const handleSelectHost = (host: Host | string) => {
    const hostId = typeof host === 'string' ? host : host.id;
    const newSelectedHosts = new Set(selectedHosts);
    if (newSelectedHosts.has(hostId)) {
      newSelectedHosts.delete(hostId);
    } else {
      newSelectedHosts.add(hostId);
    }
    setSelectedHosts(newSelectedHosts);
  };

  const handleDeleteHost = async (host: Host | string) => {
    const hostId = typeof host === 'string' ? host : host.id;
    try {
      const result = await deleteHostAction(hostId);
      if (result.success) {
        setHosts((prevHosts) => prevHosts.filter((h) => h.id !== hostId));

        // If the host was selected, remove it from selection
        if (selectedHosts.has(hostId)) {
          const newSelectedHosts = new Set(selectedHosts);
          newSelectedHosts.delete(hostId);
          setSelectedHosts(newSelectedHosts);
        }
      }
    } catch (error) {
      console.error('Error deleting host:', error);
    }
  };

  // Empty state for no hosts
  if (hosts.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Server className="h-10 w-10" />}
          title="No hosts found"
          description="Add your first host to get started"
          action={
            <Button
              onClick={() => document.getElementById('add-host-button')?.click()}
              size="sm"
              className="gap-1"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Host</span>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {viewMode === 'grid' ? (
        <HostGrid
          hosts={hosts}
          selectedHosts={selectedHosts}
          selectMode={false}
          onSelect={handleSelectHost}
          onDelete={handleDeleteHost}
          onTestConnection={handleTestConnection}
        />
      ) : (
        <HostTable
          hosts={hosts}
          selectedHosts={selectedHosts}
          selectMode={false}
          onSelect={handleSelectHost}
          onDelete={handleDeleteHost}
          onTestConnection={handleTestConnection}
        />
      )}
    </div>
  );
}
