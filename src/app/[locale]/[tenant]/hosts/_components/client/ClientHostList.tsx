'use client';

import { useState, useEffect, useCallback } from 'react';
import { Host } from '../../types';
import { HostGrid } from '../HostGrid';
import { HostTable } from '../HostTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { ClientConnectionForm, FormData as ConnectionFormData } from './ClientConnectionForm';
import { VIEW_MODE_CHANGE } from './HostActions';
import { createHost as createHostAction, testHostConnection, deleteHost as deleteHostAction } from '@/app/actions/hosts';

interface ClientHostListProps {
  initialHosts: Host[];
}

export default function ClientHostList({ initialHosts }: ClientHostListProps) {
  const [hosts, setHosts] = useState<Host[]>(initialHosts);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [showAddHost, setShowAddHost] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });

  // Listen for view mode changes
  useEffect(() => {
    const handleViewModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode: 'grid' | 'table' }>;
      setViewMode(customEvent.detail.mode);
    };

    window.addEventListener(VIEW_MODE_CHANGE, handleViewModeChange);
    return () => window.removeEventListener(VIEW_MODE_CHANGE, handleViewModeChange);
  }, []);

  const handleTestConnection = async (host: Host): Promise<boolean> => {
    try {
      console.log(`[ClientHostList] Testing connection for host: ${host.name}`);
      const result = await testHostConnection(host.id);
      
      // Update the host status in the local state
      setHosts(prevHosts => 
        prevHosts.map(h => 
          h.id === host.id 
            ? { ...h, status: result.success ? 'connected' : 'failed' } 
            : h
        )
      );
      
      return result.success;
    } catch (error) {
      console.error(`[ClientHostList] Error testing connection for host: ${host.name}`, error);
      
      // Update the host status to failed
      setHosts(prevHosts => 
        prevHosts.map(h => 
          h.id === host.id ? { ...h, status: 'failed' } : h
        )
      );
      
      return false;
    }
  };

  // Handle refresh all hosts
  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing) return;

    console.log('[ClientHostList] Refreshing all hosts');
    setIsRefreshing(true);
    
    try {
      // First, set all hosts to 'testing' status
      setHosts(prevHosts => 
        prevHosts.map(host => ({
          ...host,
          status: 'testing',
        }))
      );
      
      // Test connections concurrently
      const testPromises = hosts.map(host => handleTestConnection(host));
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

  // Listen for refresh action
  useEffect(() => {
    const handleRefresh = () => {
      handleRefreshAll();
    };

    window.addEventListener('refresh-hosts', handleRefresh);
    return () => window.removeEventListener('refresh-hosts', handleRefresh);
  }, [handleRefreshAll]);

  // Listen for add host dialog
  useEffect(() => {
    const handleOpenDialog = () => {
      setShowAddHost(true);
    };

    window.addEventListener('open-host-dialog', handleOpenDialog);
    return () => window.removeEventListener('open-host-dialog', handleOpenDialog);
  }, []);

  // Handle saving new host
  const handleSaveHost = useCallback(async () => {
    try {
      setIsSaving(true);
      const result = await createHostAction({
        name: formData.name,
        description: formData.description,
        type: formData.type as 'ssh' | 'docker' | 'portainer',
        ip: formData.ip,
        port: parseInt(formData.port || '22'),
        status: 'connected',
        created_at: new Date(),
        updated_at: new Date(),
        is_windows: false,
      });

      if (result.success && result.data) {
        setHosts((prev) => [...prev, result.data as Host]);
        setShowAddHost(false);
        // Reset form data
        setFormData({
          name: '',
          description: '',
          type: 'ssh',
          ip: '',
          port: '22',
          username: '',
          password: '',
        });
      }
    } catch (error) {
      console.error('Error adding host:', error);
    } finally {
      setIsSaving(false);
    }
  }, [formData]);

  const handleFormChange = (newFormData: ConnectionFormData) => {
    setFormData(newFormData);
  };

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
      <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-lg border border-dashed">
        <p className="mb-2 text-lg font-medium">No hosts found</p>
        <p className="text-muted-foreground mb-4">Add your first host to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      <Dialog open={showAddHost} onOpenChange={setShowAddHost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Host</DialogTitle>
          </DialogHeader>
          <ClientConnectionForm
            formData={formData}
            onChange={handleFormChange}
            onSubmit={handleSaveHost}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
