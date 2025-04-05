'use client';

import { PlusCircle, RefreshCw, Grid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { useHost } from '@/hooks/useHost';
import { useHostViewStore } from '@/store/hostViewStore';

import { HostFormDialogClient, FormData as ConnectionFormData } from './HostFormDialogClient';
import {
  OPEN_HOST_DIALOG,
  REFRESH_HOSTS,
  TEST_ALL_HOSTS_REQUESTED,
  TEST_ALL_HOSTS_COMPLETE,
  TOGGLE_HOST_VIEW_MODE,
} from './HostsEventListener';

interface HostActionsClientProps {
  hostCount?: number;
}

export function HostActionsClient({ hostCount: initialHostCount = 0 }: HostActionsClientProps) {
  const t = useTranslations('hosts');
  const c = useTranslations('common');
  const { hosts, isLoading: isRefetching, refetchHosts } = useHost();

  // Get view mode state from Zustand store
  const { viewMode, toggleViewMode } = useHostViewStore();

  const [showAddHost, setShowAddHost] = useState(false);
  const [isTestingHosts, setIsTestingHosts] = useState(false);
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

  // Listen for test completion event
  useEffect(() => {
    const handleOpenDialog = () => {
      setShowAddHost(true);
    };

    const handleTestingComplete = () => {
      console.log('[@component:HostActionsClient] All hosts tested, stopping animation');
      setIsTestingHosts(false);
    };

    window.addEventListener(OPEN_HOST_DIALOG, handleOpenDialog);
    window.addEventListener(TEST_ALL_HOSTS_COMPLETE, handleTestingComplete);

    return () => {
      window.removeEventListener(OPEN_HOST_DIALOG, handleOpenDialog);
      window.removeEventListener(TEST_ALL_HOSTS_COMPLETE, handleTestingComplete);
    };
  }, []);

  const handleRefresh = async () => {
    if (isRefetching || isTestingHosts) return;

    console.log('[@component:HostActionsClient] Starting hosts refresh and testing');
    setIsTestingHosts(true);

    // First refresh hosts data
    window.dispatchEvent(new Event(REFRESH_HOSTS));
    await refetchHosts();

    // Then request testing all hosts via the custom event
    // This will be handled by HostListClient
    window.dispatchEvent(new Event(TEST_ALL_HOSTS_REQUESTED));
  };

  const handleAddHost = () => {
    setShowAddHost(true);
  };

  const handleViewModeToggle = () => {
    console.log(
      `[@component:HostActionsClient] Toggling view mode from ${viewMode} to ${viewMode === 'grid' ? 'table' : 'grid'}`,
    );
    // Toggle view mode using Zustand store
    toggleViewMode();
    // Still dispatch the event for any listeners that might be interested
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

  // Determine if the button should animate
  const isRefreshingState = isRefetching || isTestingHosts;

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
              disabled={isRefreshingState}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingState ? 'animate-spin' : ''}`} />
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
