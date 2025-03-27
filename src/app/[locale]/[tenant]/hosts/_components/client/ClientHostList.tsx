'use client';

import { useState, useEffect, useCallback } from 'react';
import { Host } from '../../types';
import { HostGrid } from '../HostGrid';
import { HostTable } from '../HostTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { ClientConnectionForm, FormData } from './ClientConnectionForm';
import { VIEW_MODE_CHANGE } from './HostActions';
import { createHost as createHostAction, testHostConnection } from '@/app/actions/hosts';

interface ClientHostListProps {
  initialHosts: Host[];
}

export default function ClientHostList({ initialHosts }: ClientHostListProps) {
  const [hosts, setHosts] = useState<Host[]>(initialHosts);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts] = useState<Set<string>>(new Set());
  const [showAddHost, setShowAddHost] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    ip: '',
    port: '',
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
    const handleRefresh = async () => {
      const updatedHosts = [...hosts];
      for (const host of updatedHosts) {
        const result = await testHostConnection(host.id);
        if (result.success) {
          host.status = 'connected';
        } else {
          host.status = 'failed';
        }
      }
      setHosts(updatedHosts);
    };

    window.addEventListener('refresh-hosts', handleRefresh);
    return () => window.removeEventListener('refresh-hosts', handleRefresh);
  }, [hosts]);

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
        ip: formData.ip,
        port: parseInt(formData.port || '22'),
        username: formData.username,
        password: formData.password,
      });

      if (result.success && result.data) {
        setHosts(prev => [...prev, result.data]);
        setShowAddHost(false);
        setFormData({
          name: '',
          ip: '',
          port: '',
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
            onChange={setFormData}
            onSubmit={handleSaveHost}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
