'use client';

import { PlusCircle, RefreshCw, Grid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { createHost } from '@/app/actions/hosts';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';

import { ClientConnectionForm, FormData as ConnectionFormData } from './ClientConnectionForm';

// Create a custom event for view mode changes
export const VIEW_MODE_CHANGE = 'host-view-mode-change';

export function HostActions() {
  const t = useTranslations('hosts');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddHost, setShowAddHost] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });

  const handleViewModeChange = () => {
    const newMode = viewMode === 'grid' ? 'table' : 'grid';
    setViewMode(newMode);
    // Dispatch event for other components to react to view mode change
    window.dispatchEvent(new CustomEvent(VIEW_MODE_CHANGE, { detail: { mode: newMode } }));
  };

  const handleRefresh = () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    // Dispatch event for refresh action
    window.dispatchEvent(new CustomEvent('refresh-hosts'));
  };

  const handleAddHost = () => {
    setShowAddHost(true);
  };

  const handleSaveHost = async () => {
    try {
      setIsSaving(true);
      const result = await createHost({
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
        setShowAddHost(false);
        // Dispatch event to refresh the host list
        window.dispatchEvent(new CustomEvent('refresh-hosts'));
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
  };

  const handleFormChange = (newFormData: ConnectionFormData) => {
    setFormData(newFormData);
  };

  // Listen for refresh complete event
  useEffect(() => {
    const handleRefreshComplete = () => {
      setIsRefreshing(false);
    };

    window.addEventListener('refresh-hosts-complete', handleRefreshComplete);
    return () => window.removeEventListener('refresh-hosts-complete', handleRefreshComplete);
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8" onClick={handleViewModeChange}>
          {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('refresh', { fallback: 'Refresh' })}
        </Button>

        <Button size="sm" className="h-8 gap-1" onClick={handleAddHost} id="add-host-button">
          <PlusCircle className="h-4 w-4" />
          <span>{t('add_host', { fallback: 'Add Host' })}</span>
        </Button>
      </div>

      <Dialog open={showAddHost} onOpenChange={setShowAddHost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_host_dialog_title', { fallback: 'Add New Host' })}</DialogTitle>
          </DialogHeader>
          <ClientConnectionForm
            formData={formData}
            onChange={handleFormChange}
            onSubmit={handleSaveHost}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
