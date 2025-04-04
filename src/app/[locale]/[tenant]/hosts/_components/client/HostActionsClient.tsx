'use client';

import { PlusCircle, RefreshCw, Grid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import {
  OPEN_HOST_DIALOG,
  REFRESH_HOSTS,
  TOGGLE_HOST_VIEW_MODE,
} from '@/app/[locale]/[tenant]/hosts/constants';
import { useHost } from '@/hooks/useHost';

import { HostFormDialogClient, FormData as ConnectionFormData } from './HostFormDialogClient';

interface HostActionsClientProps {
  hostCount?: number;
}

export function HostActionsClient({ hostCount: initialHostCount = 0 }: HostActionsClientProps) {
  const t = useTranslations('hosts');
  const c = useTranslations('common');
  const { hosts, isLoading: isRefetching, refetchHosts, viewMode, toggleViewMode } = useHost();

  const [showAddHost, setShowAddHost] = useState(false);
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });

  // Derive host count from React Query's hosts data, falling back to the prop
  const currentHostCount = hosts?.length ?? initialHostCount;

  // Listen for external open dialog events
  useEffect(() => {
    const handleOpenDialog = () => {
      setShowAddHost(true);
    };

    window.addEventListener(OPEN_HOST_DIALOG, handleOpenDialog);
    return () => {
      window.removeEventListener(OPEN_HOST_DIALOG, handleOpenDialog);
    };
  }, []);

  const handleRefresh = async () => {
    if (isRefetching) return;
    console.log('[@component:HostActionsClient] Dispatching refresh hosts event');
    window.dispatchEvent(new Event(REFRESH_HOSTS));
    await refetchHosts();
  };

  const handleAddHost = () => {
    setShowAddHost(true);
  };

  const handleViewModeToggle = () => {
    console.log(
      `[@component:HostActionsClient] Toggling view mode from ${viewMode} to ${viewMode === 'grid' ? 'table' : 'grid'}`,
    );
    // First toggle the view mode directly in the hook
    toggleViewMode();
    // Then dispatch the event for any listeners
    window.dispatchEvent(new Event(TOGGLE_HOST_VIEW_MODE));
  };

  const handleFormChange = (newFormData: ConnectionFormData) => {
    setFormData(newFormData);
  };

  const handleDialogClose = () => {
    setShowAddHost(false);
    // Reset form data when dialog is closed
    setFormData({
      name: '',
      description: '',
      type: 'ssh',
      ip: '',
      port: '22',
      username: '',
      password: '',
    });
    // Refresh hosts list after dialog closes (in case a host was created)
    refetchHosts();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {currentHostCount > 0 && (
          <>
            <Button variant="outline" size="sm" className="h-8" onClick={handleViewModeToggle}>
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleRefresh}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              {c('refresh')}
            </Button>
          </>
        )}

        <Button size="sm" className="h-8 gap-1" onClick={handleAddHost} id="add-host-button">
          <PlusCircle className="h-4 w-4" />
          <span>{t('add_button')}</span>
        </Button>
      </div>

      <Dialog open={showAddHost} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_title')}</DialogTitle>
          </DialogHeader>
          <HostFormDialogClient
            formData={formData}
            onChange={handleFormChange}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
