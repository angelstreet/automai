'use client';

import { useState, useEffect, useCallback } from 'react';
import { Host } from '../../types';
import { HostGrid } from '../HostGrid';
import { HostTable } from '../HostTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { ClientConnectionForm, FormData as ConnectionFormData } from './ClientConnectionForm';
import { VIEW_MODE_CHANGE } from './HostActions';
import { createHost as createHostAction, testHostConnection } from '@/app/actions/hosts';
import { useToast } from '@/components/shadcn/use-toast';

interface ClientHostListProps {
  initialHosts: Host[];
}

export default function ClientHostList({ initialHosts }: ClientHostListProps) {
  const [hosts, setHosts] = useState<Host[]>(initialHosts);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts] = useState<Set<string>>(new Set());
  const [showAddHost, setShowAddHost] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
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
    const handleViewModeChange = (event: CustomEvent<{ mode: 'grid' | 'table' }>) => {
      setViewMode(event.detail.mode);
    };

    window.addEventListener(VIEW_MODE_CHANGE, handleViewModeChange as EventListener);
    return () => window.removeEventListener(VIEW_MODE_CHANGE, handleViewModeChange as EventListener);
  }, []);

  // Listen for refresh action
  useEffect(() => {
    const handleRefresh = async (event: CustomEvent<{ timestamp: number }>) => {
      try {
        const updatedHosts = [...hosts];
        let successCount = 0;
        let failedCount = 0;

        for (const host of updatedHosts) {
          try {
            const result = await testHostConnection(host.id);
            if (result.success) {
              host.status = 'connected';
              successCount++;
            } else {
              host.status = 'failed';
              failedCount++;
            }
          } catch (error) {
            host.status = 'failed';
            failedCount++;
          }
        }

        setHosts(updatedHosts);

        // Show toast with results
        toast({
          title: 'Refresh Complete',
          description: `Successfully connected to ${successCount} hosts. ${failedCount} connections failed.`,
          variant: successCount > 0 ? 'default' : 'destructive',
        });
      } catch (error) {
        console.error('Error refreshing hosts:', error);
        toast({
          title: 'Error',
          description: 'Failed to refresh host connections',
          variant: 'destructive',
        });
      } finally {
        // Dispatch event to indicate refresh is complete
        window.dispatchEvent(new CustomEvent('refresh-hosts-complete'));
      }
    };

    window.addEventListener('refresh-hosts', handleRefresh as EventListener);
    return () => window.removeEventListener('refresh-hosts', handleRefresh as EventListener);
  }, [hosts, toast]);

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
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        is_windows: false,
      });

      if (result.success && result.data) {
        setHosts((prev: Host[]) => [...prev, result.data as Host]);
        setShowAddHost(false);
        // Reset form data
        const defaultFormData: ConnectionFormData = {
          name: '',
          description: '',
          type: 'ssh',
          ip: '',
          port: '22',
          username: '',
          password: '',
        };
        setFormData(defaultFormData);
        
        toast({
          title: 'Success',
          description: 'Host added successfully',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error adding host:', error);
      toast({
        title: 'Error',
        description: 'Failed to add host',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [formData, toast]);

  const handleFormChange = (newFormData: ConnectionFormData) => {
    setFormData(newFormData);
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
          onSelect={() => {}}
          onDelete={() => {}}
          onTestConnection={() => Promise.resolve(false)}
        />
      ) : (
        <HostTable
          hosts={hosts}
          selectedHosts={selectedHosts}
          selectMode={false}
          onSelect={() => {}}
          onDelete={() => {}}
          onTestConnection={() => Promise.resolve(false)}
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
