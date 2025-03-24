'use client';

import { Plus, RefreshCw, Grid, List } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Host } from '../types';
import { useHost, useUser } from '@/context';
import { addHost as addHostAction } from '../actions';

import { ConnectionForm, FormData } from './ConnectionForm';
import { HostGrid } from './HostGrid';
import { HostTable } from './HostTable';

export default function HostContainer() {
  // Track render count for debugging
  const renderCount = useRef(0);
  const isInitialized = useRef(false);

  // Add data fetching state
  const dataFetched = useRef(false);

  // Get contexts first - all hooks must be called in the same order every render
  const userContext = useUser();
  const hostContext = useHost();
  
  // Group all state declarations after context hooks
  const [showAddHost, setShowAddHost] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [selectMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingHosts, setRefreshingHosts] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });

  // Add logging for component mount
  useEffect(() => {
    renderCount.current++;
    console.log(`[HostContainer] mounted (render #${renderCount.current})`);

    return () => {
      console.log('[HostContainer] unmounted');
    };
  }, []);

  // Add safety check for null context during initial render
  if (!hostContext) {
    console.log('[HostContainer] Host context not yet available, showing loading state');
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="h-8 w-8 animate-spin mb-4 border-t-2 border-b-2 border-primary rounded-full"></div>
        <p className="text-muted-foreground">Initializing host service...</p>
      </div>
    );
  }

  const { hosts, loading, error, fetchHosts, addHost, testConnection, testAllConnections } =
    hostContext;

  // Memoize user data to prevent dependency loop
  const userData = userContext?.user;

  // Add logging to track when host data changes
  useEffect(() => {
    if (hosts?.length > 0) {
      console.log('[HostContainer] Hosts data updated', {
        hostCount: hosts?.length || 0,
        loading,
        error,
        renderCount: renderCount.current,
      });
    }
  }, [hosts, loading, error]);

  // Fetch hosts on initial mount, only if needed
  useEffect(() => {
    if ((!hosts || hosts.length === 0) && !loading && !isInitialized.current) {
      console.log('[HostContainer] Initial mount - fetching hosts data');
      isInitialized.current = true;
      fetchHosts && fetchHosts();
    } else if (hosts && hosts.length > 0) {
      // Mark as initialized if we already have hosts
      isInitialized.current = true;
    }
  }, [hosts, loading, fetchHosts]);

  // Create a memoized test connection handler
  const handleTestConnection = useCallback(
    async (host: Host) => {
      console.log('[HostList] Test connection triggered for host:', host.id);

      if (!testConnection) {
        console.error('[HostList] testConnection not available from context');
        return false;
      }

      try {
        // Add this host to refreshing set
        setRefreshingHosts((prev) => {
          const next = new Set(prev);
          next.add(host.id);
          return next;
        });
        setIsRefreshing(true);

        // Clear the cache before testing connection
        const { clearHostsCache } = await import('../actions');
        await clearHostsCache();

        // The context's testConnection function will handle the animation state
        const result = await testConnection(host.id);
        console.log('[HostList] Test connection result:', result);

        // Refresh the hosts list to get updated statuses
        await fetchHosts();

        return result.success;
      } catch (error) {
        console.error('[HostList] Test connection error:', error);
        return false;
      } finally {
        // Remove this host from refreshing set
        setRefreshingHosts((prev) => {
          const next = new Set(prev);
          next.delete(host.id);
          return next;
        });
        // Only stop global refresh if no hosts are being refreshed
        setIsRefreshing((prev) => {
          if (prev && refreshingHosts.size <= 1) {
            // <= 1 because we haven't removed the current host yet
            return false;
          }
          return prev;
        });
      }
    },
    [testConnection, fetchHosts, refreshingHosts],
  );

  // Handle refresh all hosts - pass user data from context
  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing) return;

    console.log('[HostContainer] Refreshing all hosts');
    setIsRefreshing(true);
    try {
      // Add all hosts to refreshing set
      const hostIds = hosts.map((h) => h.id);
      setRefreshingHosts(new Set(hostIds));

      // Call testAllConnections without arguments
      await testAllConnections();
    } finally {
      setRefreshingHosts(new Set()); // Clear all refreshing hosts
      setIsRefreshing(false);
      console.log('[HostContainer] Host refresh complete');
    }
  }, [isRefreshing, testAllConnections, hosts]);

  // Handle add host form submission with user data
  const handleSaveHost = useCallback(async () => {
    console.log('[HostContainer] Saving new host', formData.name);
    setIsSaving(true);
    try {
      const hostData = {
        name: formData.name,
        description: formData.description,
        type: formData.type as 'ssh' | 'docker' | 'portainer',
        ip: formData.ip,
        port: parseInt(formData.port),
        user: formData.username,
        password: formData.password,
        status: 'connected' as const,
        created_at: new Date(),
        updated_at: new Date(),
        is_windows: false,
      };

      // Call the server action directly, without user data
      const result = await addHostAction(hostData);

      if (result.success) {
        // Close dialog
        setShowAddHost(false);

        // Reset form
        setFormData({
          name: '',
          description: '',
          type: 'ssh',
          ip: '',
          port: '22',
          username: '',
          password: '',
        });

        // Refresh the hosts list
        fetchHosts && fetchHosts();
      } else {
        console.error('[HostContainer] Error adding host:', result.error);
      }
    } catch (error) {
      console.error('[HostContainer] Error adding host:', error);
    } finally {
      setIsSaving(false);
    }
  }, [formData, addHostAction, fetchHosts, setShowAddHost]);

  // Handle host selection
  const handleSelectHost = useCallback((id: string) => {
    console.log('[DEBUG] HostContainer: host selection changed', id);
    setSelectedHosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Implement a proper removeHost function that calls the server action directly
  const removeHost = useCallback(
    async (id: string) => {
      try {
        console.log('[HostContainer] Attempting to delete host ID:', id);

        // Import the deleteHost action
        const { deleteHost } = await import('../actions');

        // Call the server action directly instead of the context function
        const result = await deleteHost(id);

        if (result.success) {
          console.log('[HostContainer] Host deleted successfully');
          // Refresh hosts list after deletion
          fetchHosts && fetchHosts();
        } else {
          console.error('[HostContainer] Failed to delete host:', result.error);
        }
      } catch (error) {
        console.error('[HostContainer] Error deleting host:', error);
      }
    },
    [fetchHosts],
  );

  // Debug rendering - only log if state changes
  useEffect(() => {
    console.log('[DEBUG] HostContainer rendering', {
      hostCount: hosts?.length || 0,
      loading,
      viewMode,
    });
  }, [hosts?.length, loading, viewMode]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Hosts</h1>
        <div className="flex items-center space-x-2">
          <div className="border rounded-md p-1 mr-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="px-2"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="px-2"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleRefreshAll}
            variant="outline"
            size="sm"
            disabled={isRefreshing || loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing || refreshingHosts.size > 0 ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button onClick={() => setShowAddHost(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Host
          </Button>
        </div>
      </div>

      {loading && hosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin mb-4"></div>
          <p className="text-muted-foreground">Loading hosts...</p>
        </div>
      ) : !loading && hosts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No hosts found</p>
          <Button onClick={() => setShowAddHost(true)} className="mt-4">
            Add your first host
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <HostGrid
          hosts={hosts}
          selectedHosts={selectedHosts}
          selectMode={selectMode}
          onSelect={handleSelectHost}
          onDelete={removeHost}
          onTestConnection={handleTestConnection}
        />
      ) : (
        <HostTable hosts={hosts} onDelete={removeHost} onTestConnection={handleTestConnection} />
      )}

      <Dialog open={showAddHost} onOpenChange={setShowAddHost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Host</DialogTitle>
          </DialogHeader>
          <ConnectionForm
            formData={formData}
            onChange={setFormData}
            onSubmit={handleSaveHost}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
