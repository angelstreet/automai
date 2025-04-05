'use client';

import { Server, PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useHost } from '@/hooks/useHost';
import { useHostViewStore } from '@/store/hostViewStore';
import { Host } from '@/types/component/hostComponentType';

import { HostGridClient } from './HostGridClient';
import { HostTableClient } from './HostTableClient';
import {
  HOST_CONNECTION_TESTING,
  HOST_CONNECTION_TESTED,
  OPEN_HOST_DIALOG,
  TEST_ALL_HOSTS_REQUESTED,
  TEST_ALL_HOSTS_COMPLETE,
} from './HostsEventListener';

interface HostListClientProps {
  initialHosts: Host[];
}

/**
 * Client component for displaying and managing hosts
 * Supports both grid and table views with React Query for state management
 */
export default function HostListClient({ initialHosts }: HostListClientProps) {
  // Initialize React Query with initial data from server
  const {
    hosts: queryHosts,
    deleteHost: deleteHostMutation,
    testConnection: testConnectionMutation,
  } = useHost();

  // Get view mode from Zustand store
  const { viewMode } = useHostViewStore();

  // Use state for hosts with initialHosts as initial value
  // This will be updated by React Query when data is fetched
  const [hosts, setHosts] = useState<Host[]>(initialHosts);
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());

  // Log when viewMode changes
  useEffect(() => {
    console.log(`[@component:HostListClient] View mode changed to: ${viewMode}`);
  }, [viewMode]);

  // Update hosts when query data changes
  useEffect(() => {
    if (queryHosts && queryHosts.length > 0) {
      setHosts(queryHosts);
    }
  }, [queryHosts]);

  // Handle connection test for a host
  const handleTestConnection = async (host: Host): Promise<boolean> => {
    try {
      console.log(`[@client:hosts:HostListClient] Testing connection for host: ${host.name}`);

      // Dispatch event that connection testing has started WITH THE HOST ID
      window.dispatchEvent(
        new CustomEvent(HOST_CONNECTION_TESTING, {
          detail: { hostId: host.id },
        }),
      );

      // Update local state to show testing status
      setHosts((prevHosts) =>
        prevHosts.map((h) => (h.id === host.id ? { ...h, status: 'testing' } : h)),
      );

      // Call the mutation
      const result = await testConnectionMutation(host.id);

      // Manually update the UI immediately for better UX
      setHosts((prevHosts) =>
        prevHosts.map((h) =>
          h.id === host.id ? { ...h, status: result.success ? 'connected' : 'failed' } : h,
        ),
      );

      // Dispatch event that connection testing has completed WITH THE HOST ID
      window.dispatchEvent(
        new CustomEvent(HOST_CONNECTION_TESTED, {
          detail: { hostId: host.id },
        }),
      );

      return result.success;
    } catch (error) {
      console.error(`[@client:hosts:HostListClient] Error testing connection:`, error);

      // Update the host status to failed
      setHosts((prevHosts) =>
        prevHosts.map((h) => (h.id === host.id ? { ...h, status: 'failed' } : h)),
      );

      // Dispatch event that connection testing has completed WITH THE HOST ID (with error)
      window.dispatchEvent(
        new CustomEvent(HOST_CONNECTION_TESTED, {
          detail: { hostId: host.id },
        }),
      );

      return false;
    }
  };

  // Handle host selection
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

  // Handle host deletion
  const handleDeleteHost = async (host: Host | string) => {
    const hostId = typeof host === 'string' ? host : host.id;

    try {
      const result = await deleteHostMutation(hostId);

      if (result.success) {
        // Remove from local state immediately for better UX
        setHosts((prevHosts) => prevHosts.filter((h) => h.id !== hostId));

        // Remove from selection if selected
        if (selectedHosts.has(hostId)) {
          const newSelectedHosts = new Set(selectedHosts);
          newSelectedHosts.delete(hostId);
          setSelectedHosts(newSelectedHosts);
        }
      }
    } catch (error) {
      console.error('[@client:hosts:HostListClient] Error deleting host:', error);
    }
  };

  // Listen for "test all hosts" request
  useEffect(() => {
    const handleTestAllHosts = async () => {
      console.log('[@component:HostListClient] Testing all hosts...');

      if (!hosts || hosts.length === 0) {
        console.log('[@component:HostListClient] No hosts to test');
        window.dispatchEvent(new Event(TEST_ALL_HOSTS_COMPLETE));
        return;
      }

      // Test each host one by one
      console.log(`[@component:HostListClient] Testing ${hosts.length} hosts`);

      for (const host of hosts) {
        try {
          console.log(`[@component:HostListClient] Testing host: ${host.name}`);
          await handleTestConnection(host);
        } catch (error) {
          console.error(`[@component:HostListClient] Error testing host ${host.name}:`, error);
        }
      }

      console.log('[@component:HostListClient] All hosts tested, dispatching complete event');
      window.dispatchEvent(new Event(TEST_ALL_HOSTS_COMPLETE));
    };

    window.addEventListener(TEST_ALL_HOSTS_REQUESTED, handleTestAllHosts);

    return () => {
      window.removeEventListener(TEST_ALL_HOSTS_REQUESTED, handleTestAllHosts);
    };
  }, [hosts]); // Include hosts in dependencies so we always have the latest

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
              onClick={() => window.dispatchEvent(new Event(OPEN_HOST_DIALOG))}
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

  // Client-side only view component rendering to prevent hydration issues
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render the appropriate view based on viewMode
  return (
    <div className="space-y-4 p-4">
      {!isClient ? (
        // Server-side placeholder with minimal content to avoid hydration mismatch
        <div className="min-h-[200px] rounded-md border p-4 animate-pulse bg-muted/10"></div>
      ) : viewMode === 'grid' ? (
        <HostGridClient
          hosts={hosts}
          selectedHosts={selectedHosts}
          selectMode={false}
          onSelect={handleSelectHost}
          onDelete={handleDeleteHost}
          onTestConnection={handleTestConnection}
        />
      ) : (
        <HostTableClient
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
